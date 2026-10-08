import { OutboxEvent } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { logger } from '../../common/logger';
import { notifyEmailReceived } from '../../integrations/telegram/notify';
import { prepareInboundDraftSafely } from '../ai/inbound-pipeline';
import { sendTaskRemindersWhenDue } from '../choreographers/followup.service';
import { handleDomainEvent } from '../automations/engine';
import { deliverCampaign } from '../campaigns/campaigns.service';
import { syncEmailWhenDue } from '../communications/sync';
import { syncWeeztixWhenDue } from '../ticketing/weeztix-schedule';
import { sendTemplatedEmail } from '../communications/transactional';
import { WEBHOOK_EVENTS } from '../webhooks/webhook-signing';
import { enqueueWebhookDeliveries, processDueWebhookDeliveries } from '../webhooks/webhooks.service';
import { claimOutboxEvent, outboxFailureStatus, pendingOutboxEvents } from './outbox.service';

type Payload = Record<string, unknown>;
type CommandHandler = (payload: Payload) => Promise<unknown>;

// Commands are addressed to exactly one handler; every other topic is a domain event
// fanned out to automations and outbound webhooks.
const COMMAND_HANDLERS: Record<string, CommandHandler> = {
    'campaign.send': payload => deliverCampaign(z.object({ campaignId: z.string().uuid() }).parse(payload).campaignId),
    'email.send': payload => sendTemplatedEmail(payload),
};

const publishDomainEvent = async (event: OutboxEvent, payload: Payload) => {
    await handleDomainEvent(event.topic, payload);
    if ((WEBHOOK_EVENTS as readonly string[]).includes(event.topic)) await enqueueWebhookDeliveries(event.topic, JSON.parse(JSON.stringify(payload)), event.id);
    // Last, so an event retried after a failed handler does not announce the same email twice.
    if (event.topic === 'email.received') {
        await notifyEmailReceived(payload);
        prepareInboundDraftSafely(payload);
    }
};

const processEvent = async (event: OutboxEvent) => {
    if (!(await claimOutboxEvent(event))) return;
    const payload = z.record(z.unknown()).parse(event.payload);
    try {
        const command = COMMAND_HANDLERS[event.topic];
        await (command ? command(payload) : publishDomainEvent(event, payload));
        await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', error: null } });
    } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'Outbox handler failed';
        await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: outboxFailureStatus(event.attempts + 1), error: message } });
    }
};

export async function processOutbox() {
    const events = await pendingOutboxEvents();
    for (const event of events) await processEvent(event);
    return events.length;
}

let running = false;
const tick = async () => {
    if (running) return;
    running = true;
    try {
        await processOutbox();
        await processDueWebhookDeliveries();
        // Not awaited: a slow mailbox must not hold up outbox and webhook delivery.
        void sendTaskRemindersWhenDue().catch(error => logger.error(`[worker] task reminders failed: ${error instanceof Error ? error.message : 'unknown error'}`));
        void syncEmailWhenDue().catch(error => logger.error(`[worker] email sync failed: ${error instanceof Error ? error.message : 'unknown error'}`));
        void syncWeeztixWhenDue().catch(error => logger.error(`[worker] Weeztix sync failed: ${error instanceof Error ? error.message : 'unknown error'}`));
    } catch (error) {
        logger.error(`[worker] tick failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
        running = false;
    }
};

// Polls the outbox, due webhook deliveries, connected mailboxes and Weeztix; returns a function that stops the loop.
export const startBackgroundWorkers = (intervalMs = Number(process.env.WORKER_POLL_MS ?? 5000)) => {
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref();
    return () => clearInterval(timer);
};
