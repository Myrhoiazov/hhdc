import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteKnowledge, KnowledgeDocument, KnowledgeFilters, listEvents, listKnowledge, saveKnowledge } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import { ConfirmDelete, listStyles as table, Pager, useListFilters } from '../ListTable';
import cls from '../CrmPage.module.scss';
import { KnowledgeSyncPanel } from './KnowledgeSyncPanel';

const SCOPES = ['GLOBAL', 'EVENT'];
const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const NO_FILTERS: KnowledgeFilters = { q: '', scope: '', status: '' };

const useKnowledgeList = () => {
    const list = useListFilters(NO_FILTERS);
    const { applied, page } = list;
    const load = useCallback(() => listKnowledge(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};

interface FiltersProps { filters: KnowledgeFilters; filtered: boolean; onChange: (patch: Partial<KnowledgeFilters>) => void; onReset: () => void }

const KnowledgeFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return <div className={table.filters}>
        <div className={table.search}><Field label="Search by title"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Scope"><select value={filters.scope} onChange={event => onChange({ scope: event.target.value })}>
            <option value="">{t('Any scope')}</option>
            {SCOPES.map(scope => <option key={scope} value={scope}>{t(`Knowledge scope: ${scope}`)}</option>)}
        </select></Field>
        <Field label="Status"><select value={filters.status} onChange={event => onChange({ status: event.target.value })}>
            <option value="">{t('Any status')}</option>
            {STATUSES.map(status => <option key={status} value={status}>{t(status)}</option>)}
        </select></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

interface DeleteProps { document: KnowledgeDocument; onDeleted: () => void; onError: (message: string) => void }

const DeleteDocument = memo(({ document, onDeleted, onError }: DeleteProps) => {
    const { t } = useTranslation();
    const remove = async () => { await deleteKnowledge(document.id); onDeleted(); };
    return <ConfirmDelete label={t('Delete document {{title}}', { title: document.title })} onDelete={remove} onError={onError} />;
});

interface RowProps extends DeleteProps { onOpen: (document: KnowledgeDocument) => void }

const DocumentRow = memo(({ document, onOpen, onDeleted, onError }: RowProps) => {
    const { t } = useTranslation();
    return <tr>
        <td><button type="button" className={`${table.name} ${table.nameButton}`} onClick={() => onOpen(document)}>{document.title}</button></td>
        <td><span className={cls.badge}>{t(`Knowledge scope: ${document.scope}`)}</span></td>
        <td><StatusBadge status={document.status} /></td>
        <td className={`${table.secondary} ${table.optional}`}>{document.sourceType ? t(`Knowledge source: ${document.sourceType}`, { defaultValue: document.sourceType }) : '—'}</td>
        <td className={`${table.secondary} ${table.optional}`}>{document.updatedAt ? new Date(document.updatedAt).toLocaleDateString() : '—'}</td>
        <td><DeleteDocument document={document} onDeleted={onDeleted} onError={onError} /></td>
    </tr>;
});

interface TableProps { documents: KnowledgeDocument[]; onOpen: (document: KnowledgeDocument) => void; onDeleted: () => void; onError: (message: string) => void }

const DocumentsTable = memo(({ documents, onOpen, onDeleted, onError }: TableProps) => {
    const { t } = useTranslation();
    return <div className={table.tableScroll}><table className={table.table}>
        <thead><tr>
            <th>{t('Title')}</th><th>{t('Scope')}</th><th>{t('Status')}</th><th className={table.optional}>{t('Source')}</th>
            <th className={table.optional}>{t('Updated')}</th><th aria-label={t('Actions')} />
        </tr></thead>
        <tbody>{documents.map(document => <DocumentRow key={document.id} document={document} onOpen={onOpen} onDeleted={onDeleted} onError={onError} />)}</tbody>
    </table></div>;
});

interface FormProps { document?: KnowledgeDocument; onSaved: () => void; onCancel: () => void }

const KnowledgeForm = memo(({ document, onSaved, onCancel }: FormProps) => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [scope, setScope] = useState(document?.scope || 'GLOBAL');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const input = { title: String(form.get('title')), content: String(form.get('content')), scope, eventId: scope === 'EVENT' ? String(form.get('eventId')) : null, status: String(form.get('status')) };
        setBusy(true);
        try { await saveKnowledge(input, document?.id); onSaved(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    const title = t(document ? 'Edit document' : 'Create knowledge document');
    return <form className={cls.panel} onSubmit={event => void submit(event)} aria-label={title}><h2>{title}</h2>
        <div className={cls.grid}>
            <Field label="Title"><input name="title" defaultValue={document?.title} required /></Field>
            <Field label="Scope"><select value={scope} onChange={event => setScope(event.target.value)}>{SCOPES.map(item => <option key={item} value={item}>{t(`Knowledge scope: ${item}`)}</option>)}</select></Field>
            {scope === 'EVENT' && <Field label="Event"><select name="eventId" defaultValue={document?.eventId || ''} required><option value="">{t('Select event')}</option>{events.data?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
            <Field label="Status"><select name="status" defaultValue={document?.status || 'DRAFT'}>{STATUSES.map(status => <option key={status} value={status}>{t(status)}</option>)}</select></Field>
        </div>
        <Field label="Content"><textarea name="content" rows={12} defaultValue={document?.content} required /></Field>
        <RequestState error={error} loading={false} />
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Save')}</Button>{document && <Button disabled={busy} onClick={onCancel}>{t('Cancel')}</Button>}</div>
    </form>;
});

// The documents the assistant answers from: a filtered, paged list and the editor of one document.
export const KnowledgeDocuments = memo(() => {
    const { t } = useTranslation();
    const knowledge = useKnowledgeList();
    const [selected, setSelected] = useState<KnowledgeDocument>();
    const [error, setError] = useState('');
    const { data } = knowledge.list;
    const { refresh: reload } = knowledge.list;
    const refresh = useCallback(() => { setSelected(undefined); setError(''); void reload(); }, [reload]);
    return <>
        <KnowledgeSyncPanel onSynced={refresh} />
        <KnowledgeFiltersBar filters={knowledge.filters} filtered={knowledge.filtered} onChange={knowledge.change} onReset={knowledge.reset} />
        <section className={cls.panel} aria-label={t('Knowledge documents')}>
            <div className={table.summary}>
                <h2>{t('Knowledge documents')}</h2>
                {data && <span className={cls.muted}>{t('Documents found: {{count}}', { count: data.total })}</span>}
            </div>
            <RequestState error={error || knowledge.list.error} loading={knowledge.list.loading && !data} />
            {data && data.total > 0 && <DocumentsTable documents={data.data} onOpen={setSelected} onDeleted={refresh} onError={setError} />}
            {data?.total === 0 && <p className={cls.muted}>{t(knowledge.filtered ? 'No documents match the filters' : 'No knowledge documents yet')}</p>}
            {data && <Pager page={knowledge.page} total={data.total} onChange={knowledge.setPage} />}
        </section>
        <KnowledgeForm key={selected?.id || 'new'} document={selected} onSaved={refresh} onCancel={() => setSelected(undefined)} />
    </>;
});
