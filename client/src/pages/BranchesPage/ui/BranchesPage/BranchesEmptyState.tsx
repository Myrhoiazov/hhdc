import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './BranchesPage.module.scss';

interface BranchesEmptyStateProps {
    onCreate: () => void;
}

export const BranchesEmptyState = memo(({ onCreate }: BranchesEmptyStateProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.emptyState}>
            <div className={s.emptyIcon}>🏢</div>
            <div className={s.emptyTitle}>{t('Филиалов пока нет')}</div>
            <div className={s.emptyText}>{t('Добавьте первый филиал вашей студии')}</div>
            <button className={s.addBtn} onClick={onCreate}>
                {t('+ Добавить филиал')}
            </button>
        </div>
    );
});