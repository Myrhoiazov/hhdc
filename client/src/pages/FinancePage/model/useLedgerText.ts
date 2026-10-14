import { useTranslation } from 'react-i18next';
import { useNumbers } from '@/shared/lib/format/useNumbers';

export const useLedgerText = (currency = 'EUR') => {
    const { t } = useTranslation();
    const numbers = useNumbers(currency);
    return {
        ...numbers,
        // Money out is written with a minus, money in with a plus.
        signed: (amount: string, direction: 'IN' | 'OUT') =>
            `${direction === 'IN' ? '+' : '−'}${numbers.money(amount)}`,
        category: (category: string) =>
            t(`Ledger category: ${category}`, { defaultValue: category }),
    };
};
