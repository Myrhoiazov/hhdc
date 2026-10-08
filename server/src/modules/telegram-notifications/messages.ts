// The words of the messages. They carry counts, amounts and names of events, never the name,
// address or phone of a person: the chat is outside the CRM and its access rules.

const clientUrl = (env: NodeJS.ProcessEnv = process.env): string => (env.CLIENT_URL ?? '').replace(/\/$/, '');
const link = (path: string, env?: NodeJS.ProcessEnv): string => (clientUrl(env) ? `\n${clientUrl(env)}${path}` : '');

export const newSalesMessage = (orders: number, env?: NodeJS.ProcessEnv): string => `🎟 New ticket orders: ${orders}${link('/events', env)}`;

export const weeztixFailedMessage = (connectionName: string, reason: string, env?: NodeJS.ProcessEnv): string =>
    `⚠️ Weeztix sync failed\nConnection: ${connectionName}\n${reason.slice(0, 200)}${link('/settings/providers', env)}`;

export const refundRequestedMessage = (amount: string, currency: string, env?: NodeJS.ProcessEnv): string =>
    `↩️ Refund requested: ${amount} ${currency}${link('/finance', env)}`;

export interface AddedExpense { category: string; amount: string; currency: string; eventName: string }

export const expenseAddedMessage = (expense: AddedExpense, env?: NodeJS.ProcessEnv): string =>
    `💸 Expense added: ${expense.category} ${expense.amount} ${expense.currency}\nEvent: ${expense.eventName}${link('/finance', env)}`;

export const contactDeletedMessage = (actorName: string, env?: NodeJS.ProcessEnv): string =>
    `🗑 A contact created from an email was deleted by ${actorName}${link('/settings/audit', env)}`;
