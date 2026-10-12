import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { activateAiProvider, ProviderConnection } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAction } from '@/shared/lib/useResource/useAction';
import { activeAiProvider, generationCandidates } from '../model/activeAi';
import { RequestState } from './common';
import page from './CrmPage.module.scss';
import cls from './AiSwitch.module.scss';

interface AiOptionProps { provider: ProviderConnection; active: boolean; busy: boolean; onChoose: (provider: ProviderConnection) => void }

const AiOption = memo(({ provider, active, busy, onChoose }: AiOptionProps) => {
    const { t } = useTranslation();
    return <button type="button" role="radio" aria-checked={active} disabled={busy} className={classNames(cls.option, { [cls.selected]: active })} onClick={() => onChoose(provider)}>
        <span className={cls.mark} aria-hidden="true" />
        <span className={cls.text}>
            <span className={cls.name}>{provider.name}</span>
            <span className={cls.model}>{String(provider.settings.model || t('Model not set'))}</span>
        </span>
        {active && <span className={cls.state}>{t('Writes answers')}</span>}
    </button>;
});

// Shows which connected AI provider writes answers and drafts, and lets another one take over.
export const AiSwitch = memo(({ providers, refresh }: { providers: ProviderConnection[]; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const candidates = generationCandidates(providers);
    const active = activeAiProvider(providers);
    if (!candidates.length) return null;
    const choose = (provider: ProviderConnection) => {
        if (provider.id === active?.id) return;
        if (window.confirm(t('Switch answers and drafts to {{name}}?', { name: provider.name }))) void action.run(() => activateAiProvider(provider.id));
    };
    return <section className={classNames(page.panel, {}, [cls.AiSwitch])} aria-label={t('Answering model')}>
        <div className={cls.intro}>
            <h3>{t('Answering model')}</h3>
            <p className={page.muted}>{t('Assistant answers and email drafts are written by the chosen model. Knowledge search keeps its own model.')}</p>
        </div>
        <div className={cls.options} role="radiogroup" aria-label={t('Answering model')}>
            {candidates.map(item => <AiOption key={item.id} provider={item} active={item.id === active?.id} busy={action.busy} onChoose={choose} />)}
        </div>
        <RequestState error={action.error} loading={false} />
    </section>;
});
