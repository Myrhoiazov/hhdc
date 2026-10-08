import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileDocument, listEventDocuments } from '@/entities/crm';
import { getUserAuthData } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState, StatusBadge } from '../common';
import { openDocumentFile } from './DocumentsTab';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const EventDocumentRow = memo(({ document, onOpen }: { document: FileDocument; onOpen: (id: string) => void }) => {
    const { t } = useTranslation();
    const status = document.contract?.status ?? document.invoice?.status;
    return <div className={cls.row}>
        <span><Link to={`/people/choreographers/${document.entityId}/documents`}>{document.title}</Link>
            <div className={own.secondary}>{`${t(`DOCTYPE_${document.type}`)} · v${document.currentVersion}`}</div></span>
        <span className={cls.actions}>
            {status && <StatusBadge status={status} />}
            <Button aria-label={`${t('Open')}: ${document.title}`} onClick={() => onOpen(document.id)}>{t('Open')}</Button>
        </span>
    </div>;
});

const EventDocumentList = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listEventDocuments(eventId), [eventId]);
    const documents = useResource(load);
    const [error, setError] = useState('');
    const open = (id: string) => { setError(''); openDocumentFile(id).catch((cause) => setError(cause instanceof Error ? cause.message : t('Request failed'))); };
    return <section id="event-documents" className={cls.panel} aria-label={t('Choreographer documents')}>
        <h2>{t('Choreographer documents')}</h2>
        <RequestState error={error || documents.error} loading={documents.loading && !documents.data} />
        {documents.data?.map((document) => <EventDocumentRow key={document.id} document={document} onOpen={open} />)}
        {documents.data?.length === 0 && <p className={cls.muted}>{t('No documents yet.')}</p>}
    </section>;
});

// The event shows the very same documents as the choreographer profile: same ids, no copies.
export const EventDocuments = memo(({ eventId }: { eventId: string }) => {
    const permissions = useSelector(getUserAuthData)?.permissions ?? [];
    return permissions.includes('documents.read') ? <EventDocumentList eventId={eventId} /> : null;
});
