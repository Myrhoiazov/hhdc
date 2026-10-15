import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Page } from './Page';
import cls from './CrmLayout.module.scss';

interface CrmLayoutProps {
    // The i18n key of the page title, or a title that is already a name (an event, a person).
    title: string;
    children: ReactNode;
    // Puts a way out above the title: for a page that is entered from a list.
    back?: { to: string; label: string };
}

// The frame of every CRM page: the scrolling page, the way back, the title and the blocks under it.
export const CrmLayout = memo(({ title, children, back }: CrmLayoutProps) => {
    const { t } = useTranslation();
    return (
        <Page>
            <div className={cls.CrmLayout}>
                {back && (
                    <Link className={cls.back} to={back.to}>
                        {`← ${t(back.label)}`}
                    </Link>
                )}
                <h1>{t(title)}</h1>
                {children}
            </div>
        </Page>
    );
});
