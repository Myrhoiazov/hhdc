import type { NotificationPlaceholder, NotificationValues } from './notifications.types';

// The text of a notification is written by staff with {{placeholders}} in it. Only the values a
// notification really has can be used: a misspelled placeholder is refused when the text is saved.

// Telegram accepts 4096 characters; the limit leaves room for the values.
export const TEMPLATE_MAX = 2000;
const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

export const usedPlaceholders = (template: string): string[] => [...new Set([...template.matchAll(PLACEHOLDER)].map(match => match[1]))];

export const unknownPlaceholders = (template: string, allowed: readonly NotificationPlaceholder[]): string[] =>
    usedPlaceholders(template).filter(name => !allowed.some(placeholder => placeholder.name === name));

const valueOf = (values: NotificationValues, name: string): string => String(values[name] ?? '').trim();
const fill = (line: string, values: NotificationValues): string => line.replace(PLACEHOLDER, (_match, name: string) => valueOf(values, name));

// A line whose every value is missing is dropped, label and all: "Country: {{country}}" says
// nothing about a buyer who gave no country, and a missing link leaves no gap.
const renderLine = (line: string, values: NotificationValues): string | null => {
    const used = usedPlaceholders(line);
    return used.length && used.every(name => !valueOf(values, name)) ? null : fill(line, values);
};

export const renderTemplate = (template: string, values: NotificationValues): string =>
    template.split('\n').map(line => renderLine(line, values)).filter((line): line is string => line !== null).join('\n').trim();

export const exampleValues = (placeholders: readonly NotificationPlaceholder[]): NotificationValues =>
    Object.fromEntries(placeholders.map(placeholder => [placeholder.name, placeholder.example]));

// Telegram refuses a message longer than 4096 characters. A text made too long by its values is
// cut and marked, so the news still arrives.
export const MESSAGE_MAX = 4000;
export const fitMessage = (text: string): string => (text.length > MESSAGE_MAX ? `${text.slice(0, MESSAGE_MAX - 1)}…` : text);
