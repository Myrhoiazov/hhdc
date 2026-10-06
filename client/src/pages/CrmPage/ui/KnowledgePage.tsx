import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteKnowledge, KnowledgeDocument, listEvents, listKnowledge, saveKnowledge } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

const KnowledgeForm = memo(({ document, refresh }: { document?: KnowledgeDocument; refresh: () => void }) => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [scope, setScope] = useState(document?.scope || 'GLOBAL');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true);
        try { await saveKnowledge({ title: String(form.get('title')), content: String(form.get('content')), scope, eventId: scope === 'EVENT' ? String(form.get('eventId')) : null, status: String(form.get('status')) }, document?.id); refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit}><h2>{t(document ? 'Edit document' : 'Create knowledge document')}</h2><Field label="Title"><input name="title" defaultValue={document?.title} required /></Field><Field label="Scope"><select value={scope} onChange={event => setScope(event.target.value)}><option value="GLOBAL">{t('Global')}</option><option value="EVENT">{t('Event')}</option></select></Field>
        {scope === 'EVENT' && <Field label="Event"><select name="eventId" defaultValue={document?.eventId || ''} required><option value="">{t('Select event')}</option>{events.data?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
        <Field label="Status"><select name="status" defaultValue={document?.status || 'DRAFT'}>{['DRAFT', 'ACTIVE', 'ARCHIVED'].map(status => <option key={status} value={status}>{t(status)}</option>)}</select></Field><Field label="Content"><textarea name="content" rows={12} defaultValue={document?.content} required /></Field><RequestState error={error} loading={false} /><Button type="submit" disabled={busy}>{t('Save')}</Button></form>;
});

export const KnowledgePage = memo(() => {
    const { t } = useTranslation();
    const knowledge = useResource(listKnowledge);
    const [selected, setSelected] = useState<KnowledgeDocument>();
    const [error, setError] = useState('');
    const refresh = () => { setSelected(undefined); void knowledge.refresh(); };
    const remove = async (id: string) => {
        if (!window.confirm(t('Delete this knowledge document?'))) return;
        try { await deleteKnowledge(id); refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
    };
    return <CrmLayout title="AI & Knowledge"><RequestState error={error || knowledge.error} loading={knowledge.loading} /><section className={cls.panel}>{knowledge.data?.data.map(document => <div className={cls.row} key={document.id}><Button onClick={() => setSelected(document)}>{document.title}</Button><span>{t(document.scope)} · {t(document.status)}</span><Button onClick={() => void remove(document.id)}>{t('Delete')}</Button></div>)}</section><KnowledgeForm key={selected?.id || 'new'} document={selected} refresh={refresh} /></CrmLayout>;
});
