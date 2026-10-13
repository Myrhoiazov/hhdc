import { useTranslation } from 'react-i18next';

// Money and counts written the way the language of the interface writes them.
export const useNumbers = (currency = 'EUR') => {
    const { i18n } = useTranslation();
    const exact = new Intl.NumberFormat(i18n.language, { style: 'currency', currency });
    const whole = new Intl.NumberFormat(i18n.language, { style: 'currency', currency, maximumFractionDigits: 0 });
    const plain = new Intl.NumberFormat(i18n.language);
    return {
        money: (amount: string | number) => exact.format(Number(amount)),
        // Without cents: for the big numbers of tiles and totals.
        rounded: (amount: string | number) => whole.format(Number(amount)),
        count: (value: number) => plain.format(value),
    };
};
