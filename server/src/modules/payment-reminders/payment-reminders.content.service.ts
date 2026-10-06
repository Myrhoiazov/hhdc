import { ClientLanguage } from '@prisma/client';

export interface StudioInfo {
    name: string;
    email: string;
    website: string;
    logoUrl: string;
    legalLine: string;
}

export interface ReminderTemplateData {
    clientName: string;
    amountValue: string;
    currency: string;
    paymentDate: Date;
    studio: StudioInfo;
}

export interface ReminderTemplate {
    subject: string;
    // Admin-editable message body only. The logo, signature and legal line are added
    // automatically around this at send time (see wrapReminderEmailHtml) — they are NOT
    // part of what goes through the rich-text editor. StarterKit's Tiptap schema has no
    // node for <div>/<img>, so any markup outside plain paragraphs/lists/bold/italic gets
    // silently dropped the moment this content is loaded into the editor; keeping the
    // letterhead out of the editable field is what makes it survive edits reliably.
    bodyHtml: string;
}

export const PAYMENT_REMINDER_PLACEHOLDERS = ['clientName', 'amount', 'date'] as const;

const LOCALE_BY_LANGUAGE: Record<ClientLanguage, string> = {
    RU: 'ru-RU',
    EN: 'en-US',
    NL: 'nl-NL',
};

const SIGNATURE_LABEL: Record<ClientLanguage, string> = {
    RU: 'С уважением,',
    EN: 'Kind regards,',
    NL: 'Met vriendelijke groet,',
};

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatAmount = (value: string, currency: string, locale: string) => (
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))
);

const formatDate = (date: Date, locale: string) => (
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
);

// Informational only, no "pay now" link — a subscription mandate charges automatically,
// the client doesn't need to act, this just gives advance notice to check their balance/card.
// These are also the seed values written into PaymentReminderTemplate the first time an
// admin opens the template editor for a language — editing them there overrides these.
export const DEFAULT_REMINDER_TEMPLATES: Record<ClientLanguage, ReminderTemplate> = {
    RU: {
        subject: 'Напоминание об оплате абонемента — {{date}}',
        bodyHtml: `<p>Здравствуйте, {{clientName}}!</p>
<p>Напоминаем, что <strong>{{date}}</strong> с вашей карты или счёта будет автоматически списано <strong>{{amount}}</strong> — очередной взнос по вашему абонементу.</p>
<p>Пожалуйста, проверьте:</p>
<ul>
<li>достаточно ли средств на счёте;</li>
<li>не истёк ли срок действия карты.</li>
</ul>
<p>Если у вас есть вопросы по платежу, свяжитесь с нами любым удобным способом.</p>`,
    },
    EN: {
        subject: 'Payment reminder for your subscription — {{date}}',
        bodyHtml: `<p>Hello {{clientName}},</p>
<p>This is a reminder that <strong>{{amount}}</strong> will be automatically charged on <strong>{{date}}</strong> for your upcoming subscription payment.</p>
<p>Please check:</p>
<ul>
<li>your card or account has sufficient funds;</li>
<li>your card hasn't expired.</li>
</ul>
<p>If you have any questions about this payment, please contact us any way that's convenient for you.</p>`,
    },
    NL: {
        subject: 'Betalingsherinnering voor uw abonnement — {{date}}',
        bodyHtml: `<p>Hallo {{clientName}},</p>
<p>Dit is een herinnering dat op <strong>{{date}}</strong> automatisch <strong>{{amount}}</strong> wordt afgeschreven voor uw aankomende abonnementsbetaling.</p>
<p>Controleer alstublieft:</p>
<ul>
<li>of er voldoende saldo op uw rekening of kaart staat;</li>
<li>of uw kaart niet is verlopen.</li>
</ul>
<p>Heeft u vragen over deze betaling? Neem gerust op de manier die u het beste uitkomt contact met ons op.</p>`,
    },
};

export const renderReminderTemplate = (
    template: ReminderTemplate,
    language: ClientLanguage,
    data: ReminderTemplateData,
) => {
    const locale = LOCALE_BY_LANGUAGE[language] ?? LOCALE_BY_LANGUAGE.RU;
    const replacements: Record<string, string> = {
        clientName: escapeHtml(data.clientName),
        amount: formatAmount(data.amountValue, data.currency, locale),
        date: formatDate(data.paymentDate, locale),
    };

    const substitute = (input: string) => input.replace(/\{\{(\w+)\}\}/g, (_match, key) => replacements[key] ?? '');

    return {
        subject: substitute(template.subject),
        bodyHtml: substitute(template.bodyHtml),
    };
};

// Builds the letterhead (logo, signature, legal line) around the admin-edited message body.
// Kept entirely outside the rich-text editor so it can never be stripped by a Tiptap round-trip.
export const wrapReminderEmailHtml = (language: ClientLanguage, innerHtml: string, studio: StudioInfo) => {
    const logoHtml = studio.logoUrl
        ? `<p style="margin:16px 0 0"><img src="${escapeHtml(studio.logoUrl)}" alt="${escapeHtml(studio.name)}" style="max-height:56px;max-width:220px" /></p>`
        : '';
    const emailLine = studio.email ? `✉️ ${escapeHtml(studio.email)}<br/>` : '';
    const websiteLine = studio.website
        ? `🌐 <a href="${escapeHtml(studio.website)}" style="color:#00c8ff;text-decoration:none">${escapeHtml(studio.website)}</a><br/>`
        : '';
    const legalHtml = studio.legalLine
        ? `<p style="color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:12px">${escapeHtml(studio.legalLine)}</p>`
        : '';

    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1d1d33">
${innerHtml}
<p style="margin-top:24px">
${SIGNATURE_LABEL[language] ?? SIGNATURE_LABEL.RU}<br/>
<strong>${escapeHtml(studio.name)}</strong><br/>
${emailLine}${websiteLine}
</p>
${legalHtml}
${logoHtml}
</div>`;
};

export const buildReminderEmail = (
    language: ClientLanguage,
    data: ReminderTemplateData,
    customTemplate?: ReminderTemplate,
) => {
    const template = customTemplate ?? DEFAULT_REMINDER_TEMPLATES[language] ?? DEFAULT_REMINDER_TEMPLATES.RU;
    const { subject, bodyHtml } = renderReminderTemplate(template, language, data);
    const html = wrapReminderEmailHtml(language, bodyHtml, data.studio);

    return { subject, html };
};
