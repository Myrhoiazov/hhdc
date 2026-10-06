import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { SelectOption } from '@/shared/ui/Select/Select';
import type { PaymentLinkPayer } from './PaymentLinkModal';
import { createPaymentLink } from './createPaymentLink';

interface UsePaymentLinkModalParams {
    clientId: string;
    payers: PaymentLinkPayer[];
    isOpen: boolean;
    onCreated?: () => void;
}

export const usePaymentLinkModal = ({ clientId, payers, isOpen, onCreated }: UsePaymentLinkModalParams) => {
    const [payerId, setPayerId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Оплата занятий');
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setPayerId(String(payers[0]?.id ?? ''));
        setAmount('');
        setDescription('Оплата занятий');
        setCheckoutUrl('');
    }, [isOpen, payers]);

    const payerOptions = useMemo<SelectOption<string>[]>(() => payers.map((payer) => ({
        value: String(payer.id), content: payer.email ? `${payer.name} · ${payer.email}` : payer.name,
    })), [payers]);
    const onCreate = useCallback(() => createPaymentLink({ clientId, payerId, amount, description, onCreated, setCheckoutUrl, setIsLoading }), [amount, clientId, description, onCreated, payerId]);
    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(checkoutUrl);
            toast.success('Payment link скопирован');
        } catch {
            toast.error('Не удалось скопировать ссылку');
        }
    }, [checkoutUrl]);
    const onOpen = useCallback(() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer'), [checkoutUrl]);

    return { payerId, setPayerId, amount, setAmount, description, setDescription, checkoutUrl, isLoading, payerOptions, onCreate, onCopy, onOpen };
};
