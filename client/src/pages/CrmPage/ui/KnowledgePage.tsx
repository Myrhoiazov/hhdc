import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteKnowledge, getDefaultEmailPrompts, KnowledgeDocument, listEvents, listKnowledge, listPrompts, listProviders, saveKnowledge } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import { EmailSimulationPanel } from './knowledge/EmailSimulationPanel';
import { KnowledgeSyncPanel } from './knowledge/KnowledgeSyncPanel';
import { PromptLibraryPanel } from './knowledge/PromptLibraryPanel';
import cls from './CrmPage.module.scss';
import own from './knowledge/Knowledge.module.scss';

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

const KnowledgeDocuments = memo(() => {
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
    return <>
        <RequestState error={error || knowledge.error} loading={knowledge.loading} />
        <KnowledgeSyncPanel onSynced={refresh} />
        <section className={cls.panel}>{knowledge.data?.data.map(document => <div className={cls.row} key={document.id}><Button onClick={() => setSelected(document)}>{document.title}</Button><span>{t(document.scope)} · {t(document.status)}</span><Button onClick={() => void remove(document.id)}>{t('Delete')}</Button></div>)}</section>
        <KnowledgeForm key={selected?.id || 'new'} document={selected} refresh={refresh} />
    </>;
});

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
