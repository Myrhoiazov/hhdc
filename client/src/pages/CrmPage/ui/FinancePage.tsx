import { memo, useCallback, useState } from 'react';
import { listRefunds } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout, RequestState } from './common';
import { FinanceLedger } from './FinanceLedger';
import { RefundsPanel } from './FinanceRefunds';

export const FinancePage = memo(() => {
    const refunds = useResource(listRefunds);
    // A decision on a refund changes the operations below, so the list is loaded again.
    const [version, setVersion] = useState(0);
    const refresh = useCallback(() => { void refunds.refresh(); setVersion(current => current + 1); }, [refunds]);
    return <CrmLayout title="Finance">
        <RequestState error={refunds.error} loading={false} />
        <RefundsPanel refunds={refunds.data?.data ?? []} refresh={refresh} />
        <FinanceLedger key={version} onRefundRequested={() => void refunds.refresh()} />
    </CrmLayout>;
});
