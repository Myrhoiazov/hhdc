import { escapeHtml } from './telegram.service';

// Above this many records in one sync run the group gets a single summary instead of one
// message per record — a first import would otherwise flood the chat.
export const MAX_INDIVIDUAL_NOTIFICATIONS = 3;

// The messages go to a group chat, so they carry a link into the CRM instead of contact
// details. No link when CLIENT_URL is unset (local development).
export const crmLink = (path: string, label: string) => {
    const base = process.env.CLIENT_URL?.replace(/\/+$/, '');
    return base ? `<a href="${escapeHtml(`${base}${path}`)}">${escapeHtml(label)}</a>` : null;
};

export const joinRows = (rows: Array<string | null>) => rows.filter((row): row is string => row !== null).join('\n');

export const buildIndividualOrSummaryMessages = <T>(
    records: T[],
    buildOne: (record: T) => string,
    buildSummary: (count: number) => string,
) => (
    records.length > MAX_INDIVIDUAL_NOTIFICATIONS ? [buildSummary(records.length)] : records.map(buildOne)
);
