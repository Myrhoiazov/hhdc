import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDefaultEmailPrompts, listPrompts, listProviders } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, RequestState } from './common';
import { EmailSimulationPanel } from './knowledge/EmailSimulationPanel';
import { KnowledgeDocuments } from './knowledge/KnowledgeDocuments';
import { PromptLibraryPanel } from './knowledge/PromptLibraryPanel';
import own from './knowledge/Knowledge.module.scss';

const loadAssistantSettings = async () => {
    const [prompts, defaults, providers] = await Promise.all([listPrompts(), getDefaultEmailPrompts(), listProviders()]);
    return { prompts, defaults, providers: providers.data.filter((provider) => provider.type === 'AI' && provider.status === 'CONNECTED') };
};

// Simulation and prompts share the saved prompt versions, so they are loaded once for both tabs.
const AssistantTools = memo(({ tab }: { tab: 'simulation' | 'prompts' }) => {
    const settings = useResource(loadAssistantSettings);
    return <>
        <RequestState error={settings.error} loading={settings.loading} />
        {settings.data && (tab === 'simulation'
            ? <EmailSimulationPanel prompts={settings.data.prompts} providers={settings.data.providers} />
            : <PromptLibraryPanel prompts={settings.data.prompts} defaults={settings.data.defaults} onChanged={() => void settings.refresh()} />)}
    </>;
});

type KnowledgeTab = 'documents' | 'simulation' | 'prompts';
const TABS: { id: KnowledgeTab; label: string }[] = [
    { id: 'documents', label: 'Knowledge documents' }, { id: 'simulation', label: 'Email simulation' }, { id: 'prompts', label: 'Prompts' },
];

export const KnowledgePage = memo(() => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<KnowledgeTab>('documents');
    return <CrmLayout title="AI & Knowledge">
        <nav className={own.tabs} aria-label={t('AI & Knowledge sections')}>
            {TABS.map((item) => <Button key={item.id} className={tab === item.id ? own.activeTab : ''} aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}>{t(item.label)}</Button>)}
        </nav>
        {tab === 'documents' ? <KnowledgeDocuments /> : <AssistantTools tab={tab} />}
    </CrmLayout>;
});
