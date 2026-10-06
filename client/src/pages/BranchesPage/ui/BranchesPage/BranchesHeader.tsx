import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './BranchesPage.module.scss';

interface BranchesHeaderProps {
    onCreate: () => void;
}

export const BranchesHeader = memo(({ onCreate }: BranchesHeaderProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.header}>
            <h1 className={s.title}>{t('Филиалы')}</h1>
            <button className={s.addBtn} onClick={onCreate}>
                {t('+ Добавить филиал')}
            </button>
        </div>
    );
});