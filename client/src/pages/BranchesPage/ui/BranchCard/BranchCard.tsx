import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './BranchCard.module.scss';

export interface Branch {
    id: number;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    description?: string;
    isActive: boolean;
}

interface BranchCardProps {
    branch: Branch;
    onEdit: (branch: Branch) => void;
    onDelete: (id: number) => void;
}

export const BranchCard = memo(({ branch, onEdit, onDelete }: BranchCardProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.card}>
            <div className={s.left}>
                <div className={s.nameRow}>
                    <span className={s.name}>{branch.name}</span>
                    <span className={classNames(s.status, { [s.active]: branch.isActive, [s.inactive]: !branch.isActive })}>
                        {branch.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                </div>
                {(branch.city || branch.address) && (
                    <div className={s.address}>
                        {[branch.city, branch.address].filter(Boolean).join(', ')}
                    </div>
                )}
                <div className={s.contacts}>
                    {branch.phone && <span>{branch.phone}</span>}
                    {branch.phone && branch.email && <span className={s.dot}>·</span>}
                    {branch.email && <span>{branch.email}</span>}
                </div>
                {branch.description && <div className={s.description}>{branch.description}</div>}
            </div>
            <div className={s.actions}>
                <button className={s.editBtn} onClick={() => onEdit(branch)} title="Редактировать">{t('✎')}</button>
                <button className={s.deleteBtn} onClick={() => onDelete(branch.id)} title="Удалить">🗑</button>
            </div>
        </div>
    );
});
