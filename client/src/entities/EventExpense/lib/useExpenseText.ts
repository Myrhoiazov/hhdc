import { useTranslation } from 'react-i18next';
import { useNumbers } from '@/shared/lib/format/useNumbers';

// How an expense is written: its money in the language of the interface, its category and status
// by their translations (or as they are, when no translation exists).
export const useExpenseText = (currency = 'EUR') => {
    const { t } = useTranslation();
    const { money } = useNumbers(currency);
    return {
        money,
        category: (category: string) => t(`Expense: ${category}`, { defaultValue: category }),
        status: (status: string) => t(`Expense status: ${status}`, { defaultValue: status }),
    };
};
