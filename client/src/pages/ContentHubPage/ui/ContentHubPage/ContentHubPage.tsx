import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';

const ContentHubPage = memo(() => {
    const { t } = useTranslation();

    return <Page>{t('ContentHub')}</Page>;
});

export default ContentHubPage;
