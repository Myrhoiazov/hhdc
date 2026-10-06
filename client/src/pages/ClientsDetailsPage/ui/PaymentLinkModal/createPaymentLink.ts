import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';

interface CreatePaymentLinkParams {
    clientId: string;
    payerId: string;
    amount: string;
    description: string;
    onCreated?: () => void;
    setCheckoutUrl: (value: string) => void;
    setIsLoading: (value: boolean) => void;
}

interface PaymentLinkResponse {
    checkoutUrl: string;
}

export const createPaymentLink = async ({
    clientId, payerId, amount, description, onCreated, setCheckoutUrl, setIsLoading,
}: CreatePaymentLinkParams) => {
    const amountValue = Number(amount.replace(',', '.'));
    if (!payerId || !Number.isFinite(amountValue) || amountValue <= 0 || !description.trim()) {
        toast.error('Выберите плательщика, сумму и описание');
        return;
    }

    setIsLoading(true);
    try {
        const { data } = await $apiPrivate.post<PaymentLinkResponse>(
            `/mollie/customers/${payerId}/payment-link`,
            { clientId: Number(clientId), amountValue, description: description.trim() },
        );
        setCheckoutUrl(data.checkoutUrl);
        onCreated?.();
        toast.success('Payment link создан');
    } catch {
        toast.error('Не удалось создать payment link');
    } finally {
        setIsLoading(false);
    }
};
