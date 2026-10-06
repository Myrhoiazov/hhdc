export const useTranslation = () => ({
    t: (key: string) => key,
    i18n: {
        changeLanguage: () => Promise.resolve(),
        language: 'en',
    },
});
