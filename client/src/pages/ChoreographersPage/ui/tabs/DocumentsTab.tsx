import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listChoreographerHistory } from '@/entities/Choreographer';
import { listChoreographerDocuments } from '@/entities/Document';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';
import { DocumentRow } from './DocumentRow';
import { UploadForm } from './DocumentUploadForm';

export const DocumentsTab = memo(
    ({ personId, canManage }: { personId: string; canManage: boolean }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerDocuments(personId), [personId]);
        const loadAssignments = useCallback(() => listChoreographerHistory(personId), [personId]);
        const documents = useResource(load);
        const assignments = useResource(loadAssignments);
        const [error, setError] = useState('');
        const run: Run = async (work) => {
            setError('');
            try {
                await work();
                await documents.refresh();
                return true;
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
                return false;
            }
        };
        return (
            <>
                <RequestState
                    error={error || documents.error}
                    loading={documents.loading && !documents.data}
                />
                <Panel aria-label={t('Documents')}>
                    <h2>{t('Documents')}</h2>
                    {documents.data?.map((document) => (
                        <DocumentRow
                            key={document.id}
                            document={document}
                            canManage={canManage}
                            run={run}
                        />
                    ))}
                    {documents.data?.length === 0 && (
                        <p className={cls.muted}>{t('No documents yet.')}</p>
                    )}
                </Panel>
                {canManage && (
                    <UploadForm
                        personId={personId}
                        assignments={assignments.data ?? []}
                        run={run}
                    />
                )}
            </>
        );
    }
);
