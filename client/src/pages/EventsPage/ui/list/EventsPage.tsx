import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { EventForm } from './EventForm';
import { EventFiltersBar } from './EventFiltersBar';
import { EventsTable } from './EventsTable';
import { useEventsList } from '../../model/useEventsList';

export const EventsPage = memo(() => {
    const { t } = useTranslation();
    const events = useEventsList();
    const { data } = events.list;
    return (
        <CrmLayout title="Events">
            <EventFiltersBar
                filters={events.filters}
                filtered={events.filtered}
                onChange={events.change}
                onReset={events.reset}
            />
            <Panel aria-label={t('All events')}>
                <div className={own.summary}>
                    <h2>{t('All events')}</h2>
                    {data && (
                        <span className={cls.muted}>
                            {t('Events found: {{count}}', { count: data.total })}
                        </span>
                    )}
                </div>
                <RequestState error={events.list.error} loading={events.list.loading && !data} />
                {data && data.total > 0 && <EventsTable events={data.data} />}
                {data?.total === 0 && (
                    <p className={cls.muted}>
                        {t(events.filtered ? 'No events match the filters' : 'No events yet')}
                    </p>
                )}
                {data && <Pager page={events.page} total={data.total} onChange={events.setPage} />}
            </Panel>
            <EventForm onSaved={() => void events.list.refresh()} />
        </CrmLayout>
    );
});
