import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './NotFoundPage.module.scss';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';

interface NotFoundPageProps {
    className?: string;
}

const NotFoundPage = ({ className }: NotFoundPageProps) => {
    const { t } = useTranslation();
    return (
        <Page className={classNames(s.NotFoundPage, {}, [className])}>{t('Page not found')}</Page>
    );
};

export default memo(NotFoundPage);
