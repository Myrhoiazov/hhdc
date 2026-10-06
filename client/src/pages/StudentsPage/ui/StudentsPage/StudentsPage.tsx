import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';

const StudentsPage = memo(() => {
    const { t } = useTranslation();

    return <Page>{t('Students')}</Page>;
});

export default StudentsPage;
