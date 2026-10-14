import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmailSimulation, simulateEmail } from '@/entities/EmailSimulation';
import { PromptVersion } from '@/entities/Prompt';
import { ProviderConnection } from '@/entities/Provider';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { SimulationHistoryPanel } from './SimulationHistoryPanel';
import { SimulationResult } from './SimulationResult';
import cls from '@/shared/ui/layout/layout.module.scss';
import { PromptSelect, ModelFields } from './ModelFields';

const formValue = (form: FormData, name: string) =>
    String(form.get(name) ?? '').trim() || undefined;

export const EmailSimulationPanel = memo(
    ({ prompts, providers }: { prompts: PromptVersion[]; providers: ProviderConnection[] }) => {
        const { t } = useTranslation();
        const [busy, setBusy] = useState(false);
        const [error, setError] = useState('');
        const [simulation, setSimulation] = useState<EmailSimulation>();
        const [runs, setRuns] = useState(0);
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError('');
            try {
                setSimulation(
                    await simulateEmail({
                        subject: String(form.get('subject') ?? ''),
                        body: String(form.get('body') ?? ''),
                        classificationPromptId: formValue(form, 'classificationPromptId'),
                        draftPromptId: formValue(form, 'draftPromptId'),
                        providerConnectionId: formValue(form, 'providerConnectionId'),
                        model: formValue(form, 'model'),
                    })
                );
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
            } finally {
                // A failed run is recorded too, so the history is refreshed either way.
                setBusy(false);
                setRuns((count) => count + 1);
            }
        };
        return (
            <>
                <Panel>
                    <h2>{t('Email simulation')}</h2>
                    <p className={cls.muted}>
                        {t(
                            'Paste a customer email to see how the assistant would answer it. Nothing is sent; the run is kept in the history below.'
                        )}
                    </p>
                    <form className={cls.grid} onSubmit={submit}>
                        <Field label="Subject">
                            <input name="subject" maxLength={500} />
                        </Field>
                        <PromptSelect
                            label="Classification prompt"
                            name="classificationPromptId"
                            prompts={prompts.filter(
                                (prompt) => prompt.key === 'email_classification'
                            )}
                        />
                        <PromptSelect
                            label="Reply prompt"
                            name="draftPromptId"
                            prompts={prompts.filter((prompt) => prompt.key === 'email_draft_body')}
                        />
                        <ModelFields providers={providers} />
                        <div className={cls.wide}>
                            <Field label="Customer email">
                                <textarea name="body" rows={8} required />
                            </Field>
                        </div>
                        <div className={cls.wide}>
                            <Button type="submit" disabled={busy}>
                                {t(busy ? 'Loading…' : 'Run simulation')}
                            </Button>
                        </div>
                    </form>
                    <RequestState error={error} loading={false} />
                    {simulation && <SimulationResult simulation={simulation} />}
                </Panel>
                <SimulationHistoryPanel refreshKey={runs} />
            </>
        );
    }
);
