import { useInvoicesList } from './useInvoicesList';
import { useInvoiceActions } from './useInvoiceActions';
import { useInvoiceDelivery } from './useInvoiceDelivery';
import { usePdfPreview } from './usePdfPreview';
import { useInvoiceModal } from './useInvoiceModal';

export const useInvoicesPage = () => {
    const list = useInvoicesList();
    const actions = useInvoiceActions(list.fetchInvoices);
    const delivery = useInvoiceDelivery(list.fetchInvoices);
    const pdfPreview = usePdfPreview();
    const modal = useInvoiceModal();

    return {
        ...list,
        ...actions,
        ...delivery,
        ...pdfPreview,
        ...modal,
    };
};
