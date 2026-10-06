import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';

const DanceSchoolPage = memo(() => {
    const { t } = useTranslation();

    return <Page>{t('Школа танцев')}</Page>;
});

export default DanceSchoolPage;
