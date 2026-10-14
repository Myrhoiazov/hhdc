import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuditOptions } from '@/entities/Audit';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { AuditFiltersBar } from './AuditFiltersBar';
import { AuditTable } from './AuditTable';
import { NO_OPTIONS, useAuditList } from '../model/useAuditList';

export const AuditPage = memo(() => {
    const { t } = useTranslation();
    const audit = useAuditList();
    const options = useResource(getAuditOptions);
    const { data } = audit.list;
    return (
        <CrmLayout title="Audit log">
            <AuditFiltersBar
                filters={audit.filters}
                options={options.data ?? NO_OPTIONS}
                filtered={audit.filtered}
                onChange={audit.change}
                onReset={audit.reset}
            />
            <Panel aria-label={t('All entries')}>
                <div className={own.summary}>
                    <h2>{t('All entries')}</h2>
                    {data && (
                        <span className={cls.muted}>
                            {t('Entries found: {{count}}', { count: data.total })}
                        </span>
                    )}
                </div>
                <RequestState
                    error={audit.list.error || options.error}
                    loading={audit.list.loading && !data}
                />
                {data && data.total > 0 && <AuditTable entries={data.data} />}
                {data?.total === 0 && (
                    <p className={cls.muted}>
                        {t(
                            audit.filtered
                                ? 'No entries match the filters'
                                : 'The audit log is empty'
                        )}
                    </p>
                )}
                {data && <Pager page={audit.page} total={data.total} onChange={audit.setPage} />}
            </Panel>
        </CrmLayout>
    );
});
