import { ClientLanguage, PaymentReminderStatus, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import { buildReminderEmail, DEFAULT_REMINDER_TEMPLATES, StudioInfo } from './payment-reminders.content.service';
import { composeEmail } from '../communication/email/email-smtp.service';

// Same convention as service.Files.ts: uploaded assets are stored as paths relative to the
// server's own public/ dir, and become absolute URLs by prefixing the server's public origin.
const resolveAbsoluteUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const origin = process.env.MODE === 'development' ? 'http://localhost:8080' : (process.env.CLIENT_URL ?? '');
    return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
};

const buildLegalLine = (organization: {
    legalName: string;
    kvkNumber: string | null;
    vatNumber: string | null;
}) => {
    const parts = [organization.legalName];
    if (organization.kvkNumber) parts.push(`KVK ${organization.kvkNumber}`);
    if (organization.vatNumber) parts.push(`VAT ${organization.vatNumber}`);

    return parts.join(' · ');
};

// Used to sign reminder emails with real business contact/legal details (studio* placeholders)
// instead of a bare, unsigned notification — reuses the same BusinessBrand/LegalOrganization
// data already entered for invoices, rather than asking an admin to type it again.
export const getStudioContactInfo = async (): Promise<StudioInfo> => {
    const brand = await prisma.businessBrand.findFirst({
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
        include: { organization: true },
    });

    if (!brand) {
        return { name: '', email: '', website: '', logoUrl: '', legalLine: '' };
    }

    return {
        name: brand.name,
        email: brand.email ?? brand.organization.email ?? '',
        website: brand.website ?? brand.organization.website ?? '',
        logoUrl: resolveAbsoluteUrl(brand.logoUrl),
        legalLine: buildLegalLine(brand.organization),
    };
};

// Matches ReminderSettings in
// client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/useReminderSettings.ts.
export const reminderSettingsSelect = {
    offsetDays: true,
    sendHour: true,
    sendMinute: true,
    senderEmailAccountId: true,
    enabled: true,
} satisfies Prisma.PaymentReminderSettingsSelect;

// Matches ReminderTemplate in
// client/src/pages/PaymentRemindersPage/ui/PaymentRemindersPage/useReminderTemplates.ts.
export const reminderTemplateSelect = {
    language: true,
    subject: true,
    bodyHtml: true,
} satisfies Prisma.PaymentReminderTemplateSelect;

export const getPaymentReminderSettings = () => prisma.paymentReminderSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    select: reminderSettingsSelect,
});

// Seeds a DB row with the built-in default copy on first access, so opening the template
// editor for a language always has something to show/edit rather than a blank form.
const getPaymentReminderTemplate = (language: ClientLanguage) => prisma.paymentReminderTemplate.upsert({
    where: { language },
    update: {},
    create: {
        language,
        subject: DEFAULT_REMINDER_TEMPLATES[language].subject,
        bodyHtml: DEFAULT_REMINDER_TEMPLATES[language].bodyHtml,
    },
    select: reminderTemplateSelect,
});

export const getAllPaymentReminderTemplates = () => Promise.all(
    (Object.values(ClientLanguage) as ClientLanguage[]).map(getPaymentReminderTemplate),
);

export const isUniqueConstraintViolation = (error: unknown) => (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const computeReminderWindow = (offsetDays: number, now = new Date()) => {
    const windowStart = startOfDay(now);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + offsetDays);
    windowEnd.setHours(23, 59, 59, 999);

    return { windowStart, windowEnd };
};

// Mollie's SubscriptionStatus is `pending | active | canceled | suspended | completed` and
// MandateStatus is `pending | valid | invalid` — Mollie has no separate "revoked" state,
// a revoked mandate simply becomes `invalid`. Only truly active, still-mandated
// subscriptions are eligible for a reminder.
export const isMandateEligibleForReminder = (mandateStatus?: string | null) => mandateStatus !== 'invalid';

const selectSubscriptionsDueForReminder = async (offsetDays: number, now = new Date()) => {
    const { windowStart, windowEnd } = computeReminderWindow(offsetDays, now);

    const subscriptions = await prisma.subscription.findMany({
        where: {
            status: 'active',
            nextPaymentDate: { gte: windowStart, lte: windowEnd },
        },
        include: {
            mandate: { select: { status: true } },
            customer: {
                include: {
                    client: { select: { id: true, firstName: true, lastName: true, preferredLanguage: true } },
                },
            },
        },
    });

    return subscriptions.filter((subscription) => isMandateEligibleForReminder(subscription.mandate?.status));
};

export type DueSubscription = Awaited<ReturnType<typeof selectSubscriptionsDueForReminder>>[number];

const createReminderDelivery = async (
    subscriptionId: number,
    targetPaymentDate: Date,
    language: ClientLanguage,
    recipientEmail: string | null,
    triggeredById?: number,
) => {
    try {
        return await prisma.paymentReminderDelivery.create({
            data: {
                subscriptionId,
                targetPaymentDate,
                language,
                recipientEmail: recipientEmail ?? '',
                triggeredById,
                status: recipientEmail ? PaymentReminderStatus.PENDING : PaymentReminderStatus.SKIPPED,
                errorMessage: recipientEmail ? undefined : 'У клиента не указан email',
            },
        });
    } catch (error) {
        if (isUniqueConstraintViolation(error)) return null;
        throw error;
    }
};

type ReminderSettings = Awaited<ReturnType<typeof getPaymentReminderSettings>>;
type ReminderTemplate = Awaited<ReturnType<typeof getPaymentReminderTemplate>>;

// The Mollie Customer is who actually pays (e.g. a parent paying for their child's Client
// record) — their own language preference takes priority over the linked Client's, which is
// only a fallback for customers that never got their own set.
export const resolveReminderLanguage = (
    customerLanguage: ClientLanguage | null | undefined,
    clientLanguage: ClientLanguage | null | undefined,
): ClientLanguage => customerLanguage ?? clientLanguage ?? ClientLanguage.RU;

interface ReminderEmailContext {
    language: ClientLanguage;
    recipientEmail: string;
    targetPaymentDate: Date;
    settings: ReminderSettings;
    studio: StudioInfo;
    template: ReminderTemplate;
}

const sendReminderEmail = async (
    delivery: { id: number },
    subscription: DueSubscription,
    context: ReminderEmailContext,
) => {
    const { language, recipientEmail, targetPaymentDate, settings, studio, template } = context;

    try {
        if (!settings.senderEmailAccountId) {
            throw new Error('Не настроен email-ящик отправителя для напоминаний об оплате');
        }

        const client = subscription.customer.client;
        const recipientName = client
            ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim()
            : (subscription.customer.givenName ?? '');
        const { subject, html } = buildReminderEmail(language, {
            clientName: recipientName,
            amountValue: subscription.amountValue.toString(),
            currency: subscription.amountCurrency,
            paymentDate: targetPaymentDate,
            studio,
        }, template);

        await composeEmail(settings.senderEmailAccountId, {
            to: [recipientEmail],
            subject,
            html,
        });

        return await prisma.paymentReminderDelivery.update({
            where: { id: delivery.id },
            data: { status: PaymentReminderStatus.SENT, sentAt: new Date() },
        });
    } catch (error) {
        return prisma.paymentReminderDelivery.update({
            where: { id: delivery.id },
            data: {
                status: PaymentReminderStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : String(error),
            },
        });
    }
};

export interface ReminderRunContext {
    settings: ReminderSettings;
    studio: StudioInfo;
    templateCache: Map<ClientLanguage, ReminderTemplate>;
}

// settings/studio/templateCache are hoisted from runPaymentReminders and shared across every
// subscription in a single run — none of them vary per subscription (studio contact info and
// settings are singletons; templates only vary by language, of which there are 3 at most), so
// re-fetching them per subscription was a pure-waste N+1 (see docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md
// for the same principle applied server-wide).
const sendReminderForSubscription = async (
    subscription: DueSubscription,
    targetPaymentDate: Date,
    runContext: ReminderRunContext,
    triggeredById?: number,
) => {
    const client = subscription.customer.client;
    const recipientEmail = subscription.customer.email;
    const language = resolveReminderLanguage(subscription.customer.preferredLanguage, client?.preferredLanguage);

    const delivery = await createReminderDelivery(
        subscription.id,
        targetPaymentDate,
        language,
        recipientEmail,
        triggeredById,
    );
    if (!delivery) return null;
    if (!recipientEmail) return delivery;

    let template = runContext.templateCache.get(language);
    if (!template) {
        template = await getPaymentReminderTemplate(language);
        runContext.templateCache.set(language, template);
    }

    return sendReminderEmail(delivery, subscription, {
        language,
        recipientEmail,
        targetPaymentDate,
        settings: runContext.settings,
        studio: runContext.studio,
        template,
    });
};

export interface RunPaymentRemindersResult {
    sent: number;
    skipped: number;
    failed: number;
    alreadyQueued: number;
}

export const runPaymentReminders = async (triggeredById?: number): Promise<RunPaymentRemindersResult> => {
    const settings = await getPaymentReminderSettings();
    const result: RunPaymentRemindersResult = { sent: 0, skipped: 0, failed: 0, alreadyQueued: 0 };

    if (!settings.enabled) {
        return result;
    }

    const subscriptions = await selectSubscriptionsDueForReminder(settings.offsetDays);
    const runContext: ReminderRunContext = {
        settings,
        studio: await getStudioContactInfo(),
        templateCache: new Map<ClientLanguage, ReminderTemplate>(),
    };

    for (const subscription of subscriptions) {
        if (!subscription.nextPaymentDate) continue;

        const delivery = await sendReminderForSubscription(
            subscription,
            subscription.nextPaymentDate,
            runContext,
            triggeredById,
        );

        if (!delivery) {
            result.alreadyQueued += 1;
            continue;
        }

        switch (delivery.status) {
            case PaymentReminderStatus.SENT:
                result.sent += 1;
                break;
            case PaymentReminderStatus.SKIPPED:
                result.skipped += 1;
                break;
            case PaymentReminderStatus.FAILED:
                result.failed += 1;
                break;
        }
    }

    return result;
};
