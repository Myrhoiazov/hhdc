import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './LangSwitcher.module.scss';

const LANGUAGES = ['ua', 'en', 'ru'];

interface LangSwitcherProps {
    className?: string;
}

export const LangSwitcher = memo(({ className }: LangSwitcherProps) => {
    const { t, i18n } = useTranslation();

    const onLanguageChange = (lang: string) => () => {
        i18n.changeLanguage(lang);
    };

    return (
        <div className={classNames(s.LangSwitcher, {}, [className])} role="group" aria-label={t('Выбор языка')}>
            {LANGUAGES.map((lang) => (
                <button
                    key={lang}
                    type="button"
                    className={classNames(s.langButton, { [s.active]: i18n.language === lang }, [])}
                    aria-pressed={i18n.language === lang}
                    onClick={onLanguageChange(lang)}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>
    );
});
