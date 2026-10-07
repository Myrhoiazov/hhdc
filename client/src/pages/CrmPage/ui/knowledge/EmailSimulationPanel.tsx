import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmailSimulation, PromptVersion, ProviderConnection, simulateEmail } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState } from '../common';
import { SimulationHistoryPanel } from './SimulationHistoryPanel';
import { SimulationResult } from './SimulationResult';
import cls from '../CrmPage.module.scss';

const PromptSelect = memo(({ label, name, prompts }: { label: string; name: string; prompts: PromptVersion[] }) => {
    const { t } = useTranslation();
    return <Field label={label}><select name={name} defaultValue="">
        <option value="">{t('Active version')}</option>
        {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{`v${prompt.version} · ${prompt.purpose} (${t(prompt.status)})`}</option>)}
    </select></Field>;
});

// The provider and the model the run is sent to. Left on "default", the first connected provider
// answers with the model saved on it, exactly as real emails do.
const ModelFields = memo(({ providers }: { providers: ProviderConnection[] }) => {
    const { t } = useTranslation();
    const [providerId, setProviderId] = useState('');
    const selected = providers.find((provider) => provider.id === providerId) ?? providers[0];
    return <>
        <Field label="AI provider"><select name="providerConnectionId" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
            <option value="">{t('Default provider')}</option>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{`${provider.name} (${provider.provider})`}</option>)}
        </select></Field>
        <Field label="Model"><input name="model" maxLength={200} placeholder={String(selected?.settings.model ?? '')} /></Field>
    </>;
});

const formValue = (form: FormData, name: string) => String(form.get(name) ?? '').trim() || undefined;

export const EmailSimulationPanel = memo(({ prompts, providers }: { prompts: PromptVersion[]; providers: ProviderConnection[] }) => {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [simulation, setSimulation] = useState<EmailSimulation>();
    const [runs, setRuns] = useState(0);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true); setError('');
        try {
            setSimulation(await simulateEmail({
                subject: String(form.get('subject') ?? ''), body: String(form.get('body') ?? ''),
                classificationPromptId: formValue(form, 'classificationPromptId'), draftPromptId: formValue(form, 'draftPromptId'),
                providerConnectionId: formValue(form, 'providerConnectionId'), model: formValue(form, 'model'),
            }));
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        // A failed run is recorded too, so the history is refreshed either way.
        finally { setBusy(false); setRuns((count) => count + 1); }
    };
    return <><section className={cls.panel}>
        <h2>{t('Email simulation')}</h2>
        <p className={cls.muted}>{t('Paste a customer email to see how the assistant would answer it. Nothing is sent; the run is kept in the history below.')}</p>
        <form className={cls.grid} onSubmit={submit}>
            <Field label="Subject"><input name="subject" maxLength={500} /></Field>
            <PromptSelect label="Classification prompt" name="classificationPromptId" prompts={prompts.filter((prompt) => prompt.key === 'email_classification')} />
            <PromptSelect label="Reply prompt" name="draftPromptId" prompts={prompts.filter((prompt) => prompt.key === 'email_draft_body')} />
            <ModelFields providers={providers} />
            <div className={cls.wide}><Field label="Customer email"><textarea name="body" rows={8} required /></Field></div>
            <div className={cls.wide}><Button type="submit" disabled={busy}>{t(busy ? 'Loading…' : 'Run simulation')}</Button></div>
        </form>
        <RequestState error={error} loading={false} />
        {simulation && <SimulationResult simulation={simulation} />}
    </section><SimulationHistoryPanel refreshKey={runs} /></>;
});
