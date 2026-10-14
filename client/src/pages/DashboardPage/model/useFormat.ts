import { useTranslation } from 'react-i18next';
import { useNumbers } from '@/shared/lib/format/useNumbers';

export const useFormat = (currency: string) => {
    const { i18n } = useTranslation();
    const numbers = useNumbers(currency);
    const regions = new Intl.DisplayNames([i18n.language], { type: 'region' });
    return {
        money: numbers.rounded,
        count: numbers.count,
        country: (code: string) => regions.of(code) ?? code,
    };
};
