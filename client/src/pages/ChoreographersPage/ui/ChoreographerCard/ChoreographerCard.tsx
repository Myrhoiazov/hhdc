import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './ChoreographerCard.module.scss';
import { classNames } from '@/shared/lib/classNames/classNames';

export type ChoreographerCategory = 'START' | 'FAN' | 'PRO';

export interface Choreographer {
    id: number;
    firstName: string;
    lastName: string;
    firstNameUa?: string | null;
    lastNameUa?: string | null;
    firstNameEn?: string | null;
    lastNameEn?: string | null;
    phone?: string | null;
    email?: string | null;
    birthday?: string | null;
    experience?: number | null;
    category?: ChoreographerCategory | null;
    photo?: string | null;
    mainPhoto?: string | null;
    additionalPhotos?: string | null;
    description?: string | null;
    templateDescription?: string | null;
    showOnSite: boolean;
}

interface ChoreographerCardProps {
    choreographer: Choreographer;
    onEdit: (c: Choreographer) => void;
    onDelete: (id: number) => void;
}

const CATEGORY_LABEL: Record<ChoreographerCategory, string> = {
    START: 'Start',
    FAN: 'Fan',
    PRO: 'Pro',
};

declare const __API__: string;

export const ChoreographerCard = memo(({ choreographer: c, onEdit, onDelete }: ChoreographerCardProps) => {
    const { t } = useTranslation();
    const photoSrc = c.photo ? `${__API__}${c.photo}` : null;

    return (
        <div className={s.card}>
            <div className={s.photoWrap}>
                {photoSrc
                    ? <img className={s.photo} src={photoSrc} alt={`${c.firstName} ${c.lastName}`} />
                    : <div className={s.photoPlaceholder}>{c.firstName[0]}{c.lastName[0]}</div>
                }
                {!c.showOnSite && <span className={s.hiddenBadge}>{t('Скрыт')}</span>}
            </div>
            <div className={s.info}>
                <div className={s.name}>{c.firstName} {c.lastName}</div>
                {c.category && (
                    <span className={classNames(s.category, {}, [s[`cat_${c.category.toLowerCase()}`]])}>
                        {CATEGORY_LABEL[c.category]}
                    </span>
                )}
                {c.experience != null && (
                    <div className={s.meta}>{t('Опыт: {{years}} лет', { years: c.experience })}</div>
                )}
                {c.email && <div className={s.meta}>{c.email}</div>}
                {c.phone && <div className={s.meta}>{c.phone}</div>}
            </div>
            <div className={s.actions}>
                <button className={s.editBtn} onClick={() => onEdit(c)} title="Редактировать">{t('✎')}</button>
                <button className={s.deleteBtn} onClick={() => onDelete(c.id)} title="Удалить">🗑</button>
            </div>
        </div>
    );
});
