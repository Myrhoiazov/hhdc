import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listEvents } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as table } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { LedgerFiltersBar } from './LedgerFiltersBar';
import { LedgerTiles } from './LedgerTiles';
import { EntriesTable } from './EntriesTable';
import { CategoriesTable } from './CategoriesTable';
import { ViewSwitch } from './ViewSwitch';
import { useLedger } from '../model/useLedger';

type Ledger = ReturnType<typeof useLedger>;

const LedgerBody = memo(({ ledger, onRefunded }: { ledger: Ledger; onRefunded: () => void }) => {
    const { t } = useTranslation();
    const list = ledger.list.data;
    const summary = ledger.summary.data;
    const empty = (
        <p className={cls.muted}>
            {t(ledger.filtered ? 'No operations match the filters' : 'No operations yet')}
        </p>
    );
    if (ledger.view === 'categories')
        return (
            <>
                {summary &&
                    (summary.byCategory.length ? (
                        <CategoriesTable
                            totals={summary.byCategory}
                            currency={summary.currency}
                            onOpen={ledger.openCategory}
                        />
                    ) : (
                        empty
                    ))}
            </>
        );
    return (
        <>
            {list && list.total > 0 && <EntriesTable entries={list.data} onRefunded={onRefunded} />}
            {list?.total === 0 && empty}
            {list && <Pager page={ledger.page} total={list.total} onChange={ledger.setPage} />}
        </>
    );
});

// Payments, refunds and costs in one list, with what they add up to under the chosen filters.
export const FinanceLedger = memo(({ onRefundRequested }: { onRefundRequested?: () => void }) => {
    const { t } = useTranslation();
    const ledger = useLedger();
    const events = useResource(listEvents);
    const summary = ledger.summary.data;
    const refunded = useCallback(() => {
        void ledger.list.refresh();
        void ledger.summary.refresh();
        onRefundRequested?.();
    }, [ledger.list, ledger.summary, onRefundRequested]);
    const loading =
        (ledger.list.loading && !ledger.list.data) || (ledger.summary.loading && !summary);
    return (
        <>
            <LedgerFiltersBar
                filters={ledger.filters}
                events={events.data?.data ?? []}
                filtered={ledger.filtered}
                onChange={ledger.change}
                onReset={ledger.reset}
            />
            {summary && <LedgerTiles summary={summary} />}
            <Panel aria-label={t('Operations')}>
                <div className={table.summary}>
                    <h2>{t('Operations')}</h2>
                    <ViewSwitch view={ledger.view} onChange={ledger.setView} />
                    {summary && (
                        <span className={cls.muted}>
                            {t('Operations found: {{count}}', { count: summary.operations })}
                        </span>
                    )}
                </div>
                <RequestState
                    error={ledger.list.error || ledger.summary.error || events.error}
                    loading={loading}
                />
                <LedgerBody ledger={ledger} onRefunded={refunded} />
                <p className={cls.muted}>
                    {t(
                        'Income is the price of the tickets that are still valid, as on the dashboard: without the fees of the ticket shop and of the payment method, and without tickets that were refunded, cancelled or transferred. Failed payments, payments of refunded orders, refunds that are not completed and cancelled expenses are listed but not counted.'
                    )}
                </p>
            </Panel>
        </>
    );
});
