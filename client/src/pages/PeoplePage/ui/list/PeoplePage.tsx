import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/entities/User';
import { Panel } from '@/shared/ui/Panel';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { listStyles as own } from '@/shared/ui/ListTable';
import { PeopleFiltersBar } from './PeopleFiltersBar';
import { PeopleTable } from './PeopleTable';
import { usePeopleList } from '../../model/usePeopleList';
import cls from '@/shared/ui/layout/layout.module.scss';

export const PeoplePage = memo(() => {
    const { t } = useTranslation();
    const people = usePeopleList();
    const { data } = people.list;
    const canDelete = useCan()('people.write');
    const refresh = useCallback(() => {
        void people.list.refresh();
    }, [people.list]);
    return (
        <CrmLayout title="People">
            <PeopleFiltersBar
                filters={people.filters}
                filtered={people.filtered}
                onChange={people.change}
                onReset={people.reset}
            />
            <Panel aria-label={t('All contacts')}>
                <div className={own.summary}>
                    <h2>{t('All contacts')}</h2>
                    {data && (
                        <div className={own.summaryEnd}>
                            <span className={cls.muted}>
                                {t('Contacts found: {{count}}', { count: data.total })}
                            </span>
                            <Pager
                                page={people.page}
                                total={data.total}
                                onChange={people.setPage}
                            />
                        </div>
                    )}
                </div>
                <RequestState error={people.list.error} loading={people.list.loading && !data} />
                {data && data.total > 0 && (
                    <PeopleTable people={data.data} onDeleted={canDelete ? refresh : undefined} />
                )}
                {data?.total === 0 && (
                    <p className={cls.muted}>
                        {t(people.filtered ? 'No contacts match the filters' : 'No contacts yet')}
                    </p>
                )}
                {data && <Pager page={people.page} total={data.total} onChange={people.setPage} />}
            </Panel>
        </CrmLayout>
    );
});
