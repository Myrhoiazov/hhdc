import { useMolliePaymentsList } from './useMolliePaymentsList';
import { useMolliePaymentsSync } from './useMolliePaymentsSync';
import { useMolliePaymentsExport } from './useMolliePaymentsExport';

export type {
    PaymentStatusFilter, PaymentMethodFilter, MolliePaymentCustomer, MolliePaymentSubscription, MolliePayment, PaymentFilters,
} from './molliePaymentTypes';
export { defaultFilters, issueStatuses } from './molliePaymentTypes';

export const useMolliePayments = () => {
    const list = useMolliePaymentsList();
    const sync = useMolliePaymentsSync(list.filters, list.loadPayments);
    const onExport = useMolliePaymentsExport(list.filters);

    return {
        ...list,
        ...sync,
        onExport,
    };
};
