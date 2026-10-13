import { ReactNode, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Page } from '@/widgets/Page';
import cls from './CrmPage.module.scss';

// `back` puts a way out above the title: for a page that is entered from a list.
interface CrmLayoutProps { title: string; children: ReactNode; back?: { to: string; label: string } }

export const CrmLayout = memo(({ title, children, back }: CrmLayoutProps) => {
    const { t } = useTranslation();
    return <Page><div className={cls.CrmPage}>
        {back && <Link className={cls.back} to={back.to}>{`← ${t(back.label)}`}</Link>}
        <h1>{t(title)}</h1>{children}
    </div></Page>;
});
