import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KnowledgeSyncSummary, syncKnowledgeV2 } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '../common';
import cls from '../CrmPage.module.scss';

const SyncResult = memo(({ summary }: { summary: KnowledgeSyncSummary }) => {
    const { t } = useTranslation();
    return <p role="status" className={cls.muted}>
        {t('Added')}: {summary.created} · {t('Updated')}: {summary.updated} · {t('Unchanged')}: {summary.unchanged}
        {' · '}{t('Edited in CRM, kept')}: {summary.editedInCrm} · {t('Failed')}: {summary.failed.length}
    </p>;
});

export const KnowledgeSyncPanel = memo(({ onSynced }: { onSynced: () => void }) => {
    const { t } = useTranslation();
    const [overwrite, setOverwrite] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState<KnowledgeSyncSummary>();
    const sync = async () => {
        setBusy(true); setError('');
        try { setSummary(await syncKnowledgeV2(overwrite)); onSynced(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <section className={cls.panel} aria-label={t('Ready-made knowledge base')}>
        <h2>{t('Ready-made knowledge base')}</h2>
        <p className={cls.muted}>{t('Loads the bundled rules, facts, FAQ and reply examples and prepares them for the email assistant.')}</p>
        <label className={cls.check}>
            <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} />
            {t('Replace documents edited in the CRM with the bundled files')}
        </label>
        <div className={cls.actions}>
            <Button disabled={busy} onClick={() => void sync()}>{t(busy ? 'Loading…' : 'Load knowledge base')}</Button>
        </div>
        <RequestState error={error} loading={false} />
        {summary && <SyncResult summary={summary} />}
    </section>;
});
