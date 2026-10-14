import { useTranslation } from 'react-i18next';
import { useNumbers } from '@/shared/lib/format/useNumbers';

export const useMoney = (currency: string) => {
    const { money } = useNumbers(currency);
    return (amount: string | null) => (amount === null ? '—' : money(amount));
};

export const useStatus = () => {
    const { t } = useTranslation();
    return (status: string) => t(`Sale status: ${status}`, { defaultValue: status });
};
