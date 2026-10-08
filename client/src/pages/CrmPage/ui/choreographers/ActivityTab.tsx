import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerActivityItem, listChoreographerActivity } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

// Filters are type prefixes; what the reader may not see is already left out by the server.
const FILTERS = [
    { value: '', label: 'All activity' },
    { value: 'CHOREOGRAPHER_PROFILE', label: 'Profile' },
    { value: 'CHOREOGRAPHER_PHOTO', label: 'Photos' },
    { value: 'CHOREOGRAPHER_ASSIGN', label: 'Events' },
    { value: 'CHOREOGRAPHER_CONVERSATION', label: 'Emails' },
    { value: 'DOCUMENT', label: 'Documents' },
    { value: 'CHOREOGRAPHER_FEE', label: 'Fees' },
];

const ActivityRow = memo(({ item }: { item: ChoreographerActivityItem }) => {
    const { t } = useTranslation();
    return <li className={cls.row}>
        <span><strong>{t(`ACTIVITY_${item.type}`, { defaultValue: item.type.replace(/_/g, ' ').toLowerCase() })}</strong>
            <div className={own.secondary}>{[item.event?.name, item.actor].filter(Boolean).join(' · ')}</div></span>
        <time className={own.secondary} dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
    </li>;
});

export const ActivityTab = memo(({ personId }: { personId: string }) => {
    const { t } = useTranslation();
    const [type, setType] = useState('');
    const [items, setItems] = useState<ChoreographerActivityItem[]>([]);
    const [nextBefore, setNextBefore] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const load = useCallback(async (before?: string) => {
        setLoading(true); setError('');
        try {
            const page = await listChoreographerActivity(personId, { type: type || undefined, before });
            setItems((current) => (before ? [...current, ...page.data] : page.data));
            setNextBefore(page.nextBefore);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
        finally { setLoading(false); }
    }, [personId, type]);
    useEffect(() => { void load(); }, [load]);
    return <section className={cls.panel} aria-label={t('Activity')}><h2>{t('Activity')}</h2>
        <Field label="Show"><select value={type} onChange={(event) => setType(event.target.value)}>
            {FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{t(filter.label)}</option>)}</select></Field>
        <RequestState error={error} loading={loading && !items.length} />
        <ul className={own.plainList}>{items.map((item) => <ActivityRow key={item.id} item={item} />)}</ul>
        {!loading && !items.length && <p className={cls.muted}>{t('Nothing has happened here yet.')}</p>}
        {nextBefore && <div className={cls.actions}><Button disabled={loading} onClick={() => void load(nextBefore)}>{t('Load more')}</Button></div>}
    </section>;
});
