import { useTranslation } from 'react-i18next';
import { useNumbers } from '@/shared/lib/format/useNumbers';

export const useFormat = (currency: string) => {
    const { i18n } = useTranslation();
    const numbers = useNumbers(currency);
    const months = new Intl.DateTimeFormat(i18n.language, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
    return {
        ...numbers,
        // "2026-05" → "May 2026" in the language of the interface.
        month: (value: string) => months.format(new Date(`${value}-01T00:00:00Z`)),
    };
};
