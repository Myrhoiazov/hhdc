import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { REGISTRATIONS_PAGE_SIZE } from '@/entities/Registration';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { useRegistrations } from '../../../model/useRegistrations';
import { RegistrationFiltersBar } from './RegistrationFiltersBar';
import { RegistrationsTable } from './RegistrationsTable';

// `version` changes when a person is added, so the list is read again.
export const Registrations = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const people = useRegistrations(eventId);
    const { data } = people.list;
    // The same pager stands above the table and under it.
    const pager = data && (
        <Pager
            page={people.page}
            total={data.total}
            pageSize={REGISTRATIONS_PAGE_SIZE}
            onChange={people.setPage}
        />
    );
    return (
        <Panel id="event-registrations" aria-label={t('Registrations')}>
            <div className={own.summary}>
                <h2>{t('Registrations')}</h2>
                {data && (
                    <div className={own.summaryEnd}>
                        <span className={cls.muted}>
                            {t('People found: {{count}}', { count: data.total })}
                        </span>
                        {pager}
                    </div>
                )}
            </div>
            <RegistrationFiltersBar
                filters={people.filters}
                filtered={people.filtered}
                onChange={people.change}
                onReset={people.reset}
            />
            <RequestState error={people.list.error} loading={people.list.loading && !data} />
            {data && data.total > 0 && <RegistrationsTable registrations={data.data} />}
            {data?.total === 0 && (
                <p className={cls.muted}>
                    {t(
                        people.filtered
                            ? 'No registrations match the filters'
                            : 'No registrations yet'
                    )}
                </p>
            )}
            {pager}
        </Panel>
    );
});
