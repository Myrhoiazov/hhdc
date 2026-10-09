import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting, saveNotificationTemplate, sendTestNotification } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import cls from './CrmPage.module.scss';
import own from './NotificationTemplate.module.scss';

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

// The message as the chat would show it, filled with example values. A line whose every value is
// missing is dropped, label and all, as the server does.
export const previewMessage = (template: string, placeholders: NotificationSetting['placeholders']): string => {
    const examples = new Map(placeholders.map(placeholder => [placeholder.name, placeholder.example.trim()]));
    const fill = (line: string) => line.replace(PLACEHOLDER, (_match, name: string) => examples.get(name) ?? '');
    // A line stays when it holds no values at all or at least one of its values is known.
    const hasSomethingToSay = (line: string) => { const used = [...line.matchAll(PLACEHOLDER)]; return !used.length || used.some(match => examples.get(match[1])); };
    return template.split('\n').filter(hasSomethingToSay).map(fill).join('\n').trim();
};

type Notice = { tone: 'ok' | 'error'; text: string } | null;

// Saving, returning to the first text and sending a test: one request at a time, with its outcome told below.
const useTemplateActions = (setting: NotificationSetting, onSaved: () => void) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(setting.template);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<Notice>(null);
    const run = async (work: () => Promise<string>) => {
        setBusy(true);
        setNotice(null);
        try { setNotice({ tone: 'ok', text: await work() }); }
        catch (cause) { setNotice({ tone: 'error', text: cause instanceof Error ? cause.message : t('Unable to save') }); }
        finally { setBusy(false); }
    };
    return {
        draft, setDraft, busy, notice, changed: draft.trim() !== setting.template,
        save: () => run(async () => { await saveNotificationTemplate(setting.key, draft.trim() || null); onSaved(); return t('Text saved'); }),
        reset: () => run(async () => { await saveNotificationTemplate(setting.key, null); setDraft(setting.defaultTemplate); onSaved(); return t('The first text is back'); }),
        test: () => run(async () => {
            if (!(await sendTestNotification(setting.key)).sent) throw new Error(t('Telegram did not accept the message'));
            return t('Test message sent');
        }),
    };
};

interface ChipsProps { placeholders: NotificationSetting['placeholders']; onInsert: (name: string) => void }

const PlaceholderChips = memo(({ placeholders, onInsert }: ChipsProps) => {
    const { t } = useTranslation();
    return <div className={own.chips} role="group" aria-label={t('Values for the text')}>
        <span className={own.meta}>{t('Values for the text')}:</span>
        {placeholders.map(placeholder => <button type="button" key={placeholder.name} className={own.chip}
            title={t(`Placeholder: ${placeholder.name}`, { defaultValue: placeholder.name })} onClick={() => onInsert(placeholder.name)}>{`{{${placeholder.name}}}`}</button>)}
    </div>;
});

type TemplateActions = ReturnType<typeof useTemplateActions>;

const TemplateButtons = memo(({ setting, actions }: { setting: NotificationSetting; actions: TemplateActions }) => {
    const { t } = useTranslation();
    const { busy, changed, notice } = actions;
    return <>
        <div className={cls.actions}>
            <Button disabled={busy || !changed} onClick={() => void actions.save()}>{t('Save text')}</Button>
            <Button disabled={busy || (!setting.customised && !changed)} onClick={() => void actions.reset()}>{t('Return the first text')}</Button>
            <Button disabled={busy || changed || !setting.configured} onClick={() => void actions.test()}>{t('Send a test message')}</Button>
        </div>
        {notice && <span role={notice.tone === 'error' ? 'alert' : 'status'} className={notice.tone === 'error' ? cls.error : own.meta}>{notice.text}</span>}
    </>;
});

// A value is put where the cursor stands, or at the end when the field was never touched.
const insertAt = (text: string, field: HTMLTextAreaElement | null, name: string): string => {
    const [start, end] = [field?.selectionStart ?? text.length, field?.selectionEnd ?? text.length];
    return `${text.slice(0, start)}{{${name}}}${text.slice(end)}`;
};

// The text of one notification: written with {{placeholders}}, previewed with example values.
export const NotificationTemplate = memo(({ setting, title, onSaved }: { setting: NotificationSetting; title: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const actions = useTemplateActions(setting, onSaved);
    const field = useRef<HTMLTextAreaElement>(null);
    const insert = (name: string) => { actions.setDraft(insertAt(actions.draft, field.current, name)); field.current?.focus(); };
    return <div className={own.editor}>
        <label className={own.editorField}>
            <span className={own.meta}>{t('Message text')}</span>
            <textarea ref={field} className={own.template} rows={4} maxLength={2000} aria-label={t('Message text: {{title}}', { title })}
                value={actions.draft} onChange={event => actions.setDraft(event.target.value)} />
        </label>
        <div className={own.editorField}>
            <span className={own.meta}>{t('How it will look')}</span>
            <pre className={own.preview}>{previewMessage(actions.draft, setting.placeholders) || t('The message is empty and will not be sent')}</pre>
        </div>
        <PlaceholderChips placeholders={setting.placeholders} onInsert={insert} />
        <TemplateButtons setting={setting} actions={actions} />
    </div>;
});
