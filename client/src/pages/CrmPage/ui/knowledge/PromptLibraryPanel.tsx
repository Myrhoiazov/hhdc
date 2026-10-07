import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { activatePrompt, createPromptVersion, EMAIL_PROMPT_KEYS, EmailPromptKey, PromptVersion } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Knowledge.module.scss';

const KEY_TITLES: Record<EmailPromptKey, string> = { email_classification: 'Classification prompt', email_draft_body: 'Reply prompt' };
// Substituted per email by the server; listed so that an edited prompt keeps using them.
const PLACEHOLDERS: Record<EmailPromptKey, string> = { email_classification: '', email_draft_body: '{{current_date}} · {{replyLanguage}} · {{email}} · {{emailThread}} · {{crmContext}} · {{knowledge}}' };

interface PromptSlotProps {
    promptKey: EmailPromptKey;
    versions: PromptVersion[];
    defaultContent: string;
    onChanged: () => void;
}

const VersionRow = memo(({ version, onActivate, busy }: { version: PromptVersion; onActivate: (id: string) => void; busy: boolean }) => {
    const { t } = useTranslation();
    return <div className={cls.row}>
        <span>{`v${version.version} · ${version.purpose}`}</span>
        <span className={cls.actions}>
            <StatusBadge status={version.status} />
            {version.status !== 'ACTIVE' && <Button disabled={busy} onClick={() => onActivate(version.id)}>{t('Activate')}</Button>}
        </span>
    </div>;
});

const PromptSlot = memo(({ promptKey, versions, defaultContent, onChanged }: PromptSlotProps) => {
    const { t } = useTranslation();
    const active = versions.find((version) => version.status === 'ACTIVE');
    const [content, setContent] = useState(active?.systemPrompt ?? defaultContent);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const run = async (work: () => Promise<unknown>) => {
        setBusy(true); setError('');
        try { await work(); onChanged(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const purpose = String(new FormData(event.currentTarget).get('purpose') ?? '');
        void run(() => createPromptVersion({ key: promptKey, purpose, systemPrompt: content }));
    };
    return <section className={cls.panel} aria-label={t(KEY_TITLES[promptKey])}>
        <h2>{t(KEY_TITLES[promptKey])}</h2>
        <p className={cls.muted}>{t(active ? 'A saved version is active.' : 'The built-in text is in use until a saved version is activated.')}</p>
        {PLACEHOLDERS[promptKey] && <p className={cls.muted}>{`${t('Placeholders filled in for every email')}: ${PLACEHOLDERS[promptKey]}`}</p>}
        {versions.map((version) => <VersionRow key={version.id} version={version} busy={busy} onActivate={(id) => void run(() => activatePrompt(id))} />)}
        <form className={own.promptForm} onSubmit={save}>
            <Field label="Version note"><input name="purpose" required maxLength={500} placeholder={t('What changed in this version')} /></Field>
            <Field label="Prompt text"><textarea rows={12} value={content} required onChange={(event) => setContent(event.target.value)} /></Field>
            <div className={cls.actions}>
                <Button type="submit" disabled={busy || !content.trim()}>{t('Save as new version')}</Button>
                <Button disabled={busy} onClick={() => setContent(defaultContent)}>{t('Insert built-in text')}</Button>
            </div>
        </form>
        <RequestState error={error} loading={false} />
    </section>;
});

export const PromptLibraryPanel = memo(({ prompts, defaults, onChanged }: {
    prompts: PromptVersion[]; defaults: Record<EmailPromptKey, string>; onChanged: () => void;
}) => <>{EMAIL_PROMPT_KEYS.map((key) => <PromptSlot key={`${key}:${prompts.length}`} promptKey={key} defaultContent={defaults[key]}
    versions={prompts.filter((prompt) => prompt.key === key)} onChanged={onChanged} />)}</>);
