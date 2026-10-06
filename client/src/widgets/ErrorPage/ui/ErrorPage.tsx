import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import s from './ErrorPage.module.scss';
import { Button } from '@/shared/ui/Button';

interface ErrorPageProps {
    className?: string;
}

const ErrorPage = ({ className }: ErrorPageProps) => {
    const { t } = useTranslation();

    const reloadPage = () => {
        location.reload();
    };

    return (
        <div className={classNames(s.ErrorPage, {}, [className])}>
            <p>{t('ErrorPage')}</p>
            <Button onClick={reloadPage}>{t('ReloadPage')}</Button>
        </div>
    );
};

export default memo(ErrorPage);
