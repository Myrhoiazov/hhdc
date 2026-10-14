import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    activatePrompt,
    createPromptVersion,
    EmailPromptKey,
    PromptVersion,
} from '@/entities/Prompt';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Knowledge.module.scss';
import { KEY_TITLES, PLACEHOLDERS } from '../../model/promptKeys';

interface PromptSlotProps {
    promptKey: EmailPromptKey;
    versions: PromptVersion[];
    defaultContent: string;
    onChanged: () => void;
}

const VersionRow = memo(
    ({
        version,
        onActivate,
        busy,
    }: {
        version: PromptVersion;
        onActivate: (id: string) => void;
        busy: boolean;
    }) => {
        const { t } = useTranslation();
        return (
            <div className={cls.row}>
                <span>{`v${version.version} · ${version.purpose}`}</span>
                <span className={cls.actions}>
                    <StatusBadge status={version.status} />
                    {version.status !== 'ACTIVE' && (
                        <Button disabled={busy} onClick={() => onActivate(version.id)}>
                            {t('Activate')}
                        </Button>
                    )}
                </span>
            </div>
        );
    }
);

export const PromptSlot = memo(
    ({ promptKey, versions, defaultContent, onChanged }: PromptSlotProps) => {
        const { t } = useTranslation();
        const active = versions.find((version) => version.status === 'ACTIVE');
        const [content, setContent] = useState(active?.systemPrompt ?? defaultContent);
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState('');
        const run = async (work: () => Promise<unknown>) => {
            setBusy(true);
            setError('');
            try {
                await work();
                onChanged();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
            } finally {
                setBusy(false);
            }
        };
        const save = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const purpose = String(new FormData(event.currentTarget).get('purpose') ?? '');
            void run(() => createPromptVersion({ key: promptKey, purpose, systemPrompt: content }));
        };
        return (
            <Panel aria-label={t(KEY_TITLES[promptKey])}>
                <h2>{t(KEY_TITLES[promptKey])}</h2>
                <p className={cls.muted}>
                    {t(
                        active
                            ? 'A saved version is active.'
                            : 'The built-in text is in use until a saved version is activated.'
                    )}
                </p>
                {PLACEHOLDERS[promptKey] && (
                    <p
                        className={cls.muted}
                    >{`${t('Placeholders filled in for every email')}: ${PLACEHOLDERS[promptKey]}`}</p>
                )}
                {versions.map((version) => (
                    <VersionRow
                        key={version.id}
                        version={version}
                        busy={busy}
                        onActivate={(id) => void run(() => activatePrompt(id))}
                    />
                ))}
                <form className={own.promptForm} onSubmit={save}>
                    <Field label="Version note">
                        <input
                            name="purpose"
                            required
                            maxLength={500}
                            placeholder={t('What changed in this version')}
                        />
                    </Field>
                    <Field label="Prompt text">
                        <textarea
                            rows={12}
                            value={content}
                            required
                            onChange={(event) => setContent(event.target.value)}
                        />
                    </Field>
                    <div className={cls.actions}>
                        <Button type="submit" disabled={busy || !content.trim()}>
                            {t('Save as new version')}
                        </Button>
                        <Button disabled={busy} onClick={() => setContent(defaultContent)}>
                            {t('Insert built-in text')}
                        </Button>
                    </div>
                </form>
                <RequestState error={error} loading={false} />
            </Panel>
        );
    }
);
