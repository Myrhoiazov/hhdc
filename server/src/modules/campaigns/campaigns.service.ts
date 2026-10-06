import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { emailProvider } from '../communications/send';
import { renderTemplate } from '../communications/template-render';
import { segmentWhere } from '../segments/segment-dsl';
import { resolveRecipients } from './recipients';

const MAX_RECIPIENTS = 5000;
const DELIVERY_BATCH = 50;

const requireCampaign = async (id: string) => {
    const campaign = await prisma.campaign.findUnique({ where: { id }, include: { segment: true, template: true } });
    if (!campaign) throw new ApiError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign not found');
    return campaign;
};

const loadCandidates = async (filterDsl: unknown) => {
    const where = { AND: [segmentWhere(filterDsl), { status: 'ACTIVE' as const }] };
    const total = await prisma.person.count({ where });
    if (total > MAX_RECIPIENTS) throw new ApiError(409, 'SEGMENT_TOO_LARGE', `Segment matches ${total} people; narrow it below ${MAX_RECIPIENTS}`);
    return prisma.person.findMany({
        where, take: MAX_RECIPIENTS,
        select: { id: true, email: true, language: true, consents: { select: { type: true, status: true, withdrawnAt: true } } },
    });
};

// Dry run: resolves recipients and exclusions without changing any state.
export const previewCampaign = async (id: string) => {
    const campaign = await requireCampaign(id);
    const resolution = resolveRecipients(await loadCandidates(campaign.segment.filterDsl));
    return { campaignId: id, recipients: resolution.recipients.length, byLanguage: resolution.byLanguage, excluded: resolution.excluded };
};

export interface SendCampaignParams { id: string; actorUserId: string; confirmRecipientCount: number }

export const sendCampaign = async ({ id, actorUserId, confirmRecipientCount }: SendCampaignParams) => {
    const campaign = await requireCampaign(id);
    if (!campaign.templateId || !campaign.providerConnectionId) throw new ApiError(409, 'CAMPAIGN_INCOMPLETE', 'Campaign needs a template and an email provider');
    const { recipients } = resolveRecipients(await loadCandidates(campaign.segment.filterDsl));
    if (!recipients.length) throw new ApiError(409, 'CAMPAIGN_HAS_NO_RECIPIENTS', 'No consenting recipients match this segment');
    if (recipients.length !== confirmRecipientCount) throw new ApiError(409, 'RECIPIENT_COUNT_CHANGED', `Segment now resolves to ${recipients.length} recipients; review the preview and confirm again`);
    return prisma.$transaction(async tx => {
        const claimed = await tx.campaign.updateMany({ where: { id, status: { in: ['DRAFT', 'SCHEDULED'] } }, data: { status: 'SENDING' } });
        if (!claimed.count) throw new ApiError(409, 'CAMPAIGN_ALREADY_STARTED', 'Campaign is already sending or finished');
        // Recipient snapshot: later segment changes never rewrite campaign history.
        await tx.deliveryLog.createMany({ data: recipients.map(recipient => ({ campaignId: id, personId: recipient.personId, destination: recipient.destination })) });
        await tx.outboxEvent.create({ data: { topic: 'campaign.send', payload: { campaignId: id } } });
        await tx.auditLog.create({ data: { actorUserId, action: 'CAMPAIGN_SENT', entityType: 'Campaign', entityId: id, after: { recipients: recipients.length } } });
        return { campaignId: id, status: 'SENDING', recipients: recipients.length };
    });
};

interface DeliveryContext {
    campaignId: string;
    subject: string;
    body: string;
    sender: string;
    send: (input: { sender: string; recipient: string; subject: string; content: string }) => Promise<unknown>;
}

const deliveryContext = async (campaignId: string): Promise<DeliveryContext> => {
    const campaign = await requireCampaign(campaignId);
    if (!campaign.template || !campaign.providerConnectionId) throw new Error('Campaign lost its template or provider');
    const { connection, provider } = await emailProvider(campaign.providerConnectionId);
    const { sender } = z.object({ sender: z.string().email() }).parse(connection.settings);
    return {
        campaignId, sender,
        subject: campaign.subject ?? campaign.template.subject,
        body: campaign.template.bodyText ?? campaign.template.bodyHtml,
        send: input => provider.sendMessage(input),
    };
};

const deliverOne = async (context: DeliveryContext, log: { id: string; destination: string | null; person: { firstName: string; lastName: string; language: string | null } }) => {
    try {
        if (!log.destination) throw new Error('Recipient snapshot has no destination');
        const variables = { person: log.person };
        await context.send({ sender: context.sender, recipient: log.destination, subject: renderTemplate(context.subject, variables), content: renderTemplate(context.body, variables) });
        await prisma.deliveryLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (error) {
        await prisma.deliveryLog.update({ where: { id: log.id }, data: { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed' } });
    }
};

const finishCampaign = async (campaignId: string) => {
    const sent = await prisma.deliveryLog.count({ where: { campaignId, status: 'SENT' } });
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: sent ? 'COMPLETED' : 'FAILED' } });
};

// Worker entry point (outbox topic `campaign.send`). Provider calls stay outside DB transactions.
export const deliverCampaign = async (campaignId: string) => {
    const context = await deliveryContext(campaignId);
    for (;;) {
        const pending = await prisma.deliveryLog.findMany({
            where: { campaignId, status: 'PENDING' }, take: DELIVERY_BATCH,
            include: { person: { select: { firstName: true, lastName: true, language: true } } },
        });
        if (!pending.length) break;
        for (const log of pending) await deliverOne(context, log);
    }
    await finishCampaign(campaignId);
};

export const sendCampaignTest = async (id: string, recipient: string) => {
    const context = await deliveryContext(id);
    const variables = { person: { firstName: 'Test', lastName: 'Recipient', language: 'en' } };
    await context.send({ sender: context.sender, recipient, subject: `[TEST] ${renderTemplate(context.subject, variables)}`, content: renderTemplate(context.body, variables) });
    return { sent: true, recipient };
};
