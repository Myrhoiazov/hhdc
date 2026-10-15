import { NotificationSetting } from '@/entities/Notification';

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

// The message as the chat would show it, filled with example values. A line whose every value is
// missing is dropped, label and all, as the server does.
export const previewMessage = (
    template: string,
    placeholders: NotificationSetting['placeholders']
): string => {
    const examples = new Map(
        placeholders.map((placeholder) => [placeholder.name, placeholder.example.trim()])
    );
    const fill = (line: string) =>
        line.replace(PLACEHOLDER, (_match, name: string) => examples.get(name) ?? '');
    // A line stays when it holds no values at all or at least one of its values is known.
    const hasSomethingToSay = (line: string) => {
        const used = [...line.matchAll(PLACEHOLDER)];
        return !used.length || used.some((match) => examples.get(match[1]));
    };
    return template.split('\n').filter(hasSomethingToSay).map(fill).join('\n').trim();
};

// A value is put where the cursor stands, or at the end when the field was never touched.
export const insertAt = (text: string, field: HTMLTextAreaElement | null, name: string): string => {
    const [start, end] = [field?.selectionStart ?? text.length, field?.selectionEnd ?? text.length];
    return `${text.slice(0, start)}{{${name}}}${text.slice(end)}`;
};
