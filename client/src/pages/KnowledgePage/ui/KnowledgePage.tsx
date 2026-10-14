import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { KnowledgeDocuments } from './documents/KnowledgeDocuments';
import own from './Knowledge.module.scss';
import { KnowledgeTab, TABS } from '../model/sections';
import { AssistantTools } from './AssistantTools';

export const KnowledgePage = memo(() => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<KnowledgeTab>('documents');
    return (
        <CrmLayout title="AI & Knowledge">
            <nav className={own.tabs} aria-label={t('AI & Knowledge sections')}>
                {TABS.map((item) => (
                    <Button
                        key={item.id}
                        className={tab === item.id ? own.activeTab : ''}
                        aria-pressed={tab === item.id}
                        onClick={() => setTab(item.id)}
                    >
                        {t(item.label)}
                    </Button>
                ))}
            </nav>
            {tab === 'documents' ? <KnowledgeDocuments /> : <AssistantTools tab={tab} />}
        </CrmLayout>
    );
});
