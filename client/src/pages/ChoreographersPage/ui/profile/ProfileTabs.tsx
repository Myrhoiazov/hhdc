import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Can } from '@/entities/User';
import { classNames } from '@/shared/lib/classNames/classNames';
import own from '../Choreographers.module.scss';
import { TABS, TabId } from '../../model/tabs';

export const ProfileTabs = memo(
    ({ personId, active, can }: { personId: string; active: TabId; can: Can }) => {
        const { t } = useTranslation();
        return (
            <nav className={own.tabs} aria-label={t('Profile sections')}>
                {TABS.filter((tab) => can(tab.permission)).map((tab) => (
                    <Link
                        key={tab.id}
                        to={`/people/choreographers/${personId}/${tab.id}`}
                        aria-current={tab.id === active ? 'page' : undefined}
                        className={classNames(own.tab, { [own.activeTab]: tab.id === active })}
                    >
                        {t(tab.label)}
                    </Link>
                ))}
            </nav>
        );
    }
);
