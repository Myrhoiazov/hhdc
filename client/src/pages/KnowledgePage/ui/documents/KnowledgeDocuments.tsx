import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KnowledgeDocument } from '@/entities/Knowledge';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as table } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { KnowledgeSyncPanel } from './KnowledgeSyncPanel';
import { KnowledgeFiltersBar } from './KnowledgeFiltersBar';
import { DocumentsTable } from './DocumentsTable';
import { KnowledgeForm } from './KnowledgeForm';
import { useKnowledgeList } from '../../model/useKnowledgeList';

// The documents the assistant answers from: a filtered, paged list and the editor of one document.
export const KnowledgeDocuments = memo(() => {
    const { t } = useTranslation();
    const knowledge = useKnowledgeList();
    const [selected, setSelected] = useState<KnowledgeDocument>();
    const [error, setError] = useState('');
    const { data } = knowledge.list;
    const { refresh: reload } = knowledge.list;
    const refresh = useCallback(() => {
        setSelected(undefined);
        setError('');
        void reload();
    }, [reload]);
    return (
        <>
            <KnowledgeSyncPanel onSynced={refresh} />
            <KnowledgeFiltersBar
                filters={knowledge.filters}
                filtered={knowledge.filtered}
                onChange={knowledge.change}
                onReset={knowledge.reset}
            />
            <Panel aria-label={t('Knowledge documents')}>
                <div className={table.summary}>
                    <h2>{t('Knowledge documents')}</h2>
                    {data && (
                        <span className={cls.muted}>
                            {t('Documents found: {{count}}', { count: data.total })}
                        </span>
                    )}
                </div>
                <RequestState
                    error={error || knowledge.list.error}
                    loading={knowledge.list.loading && !data}
                />
                {data && data.total > 0 && (
                    <DocumentsTable
                        documents={data.data}
                        onOpen={setSelected}
                        onDeleted={refresh}
                        onError={setError}
                    />
                )}
                {data?.total === 0 && (
                    <p className={cls.muted}>
                        {t(
                            knowledge.filtered
                                ? 'No documents match the filters'
                                : 'No knowledge documents yet'
                        )}
                    </p>
                )}
                {data && (
                    <Pager page={knowledge.page} total={data.total} onChange={knowledge.setPage} />
                )}
            </Panel>
            <KnowledgeForm
                key={selected?.id || 'new'}
                document={selected}
                onSaved={refresh}
                onCancel={() => setSelected(undefined)}
            />
        </>
    );
});
