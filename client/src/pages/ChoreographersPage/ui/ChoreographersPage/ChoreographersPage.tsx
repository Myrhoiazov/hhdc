import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { ChoreographerCard, Choreographer } from '../ChoreographerCard/ChoreographerCard';
import { ChoreographerModal } from '../ChoreographerModal/ChoreographerModal';
import { useChoreographersPage } from './useChoreographersPage';
import s from './ChoreographersPage.module.scss';

const ChoreographersHeader = ({ onAdd }: { onAdd: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.header}>
            <h1 className={s.title}>{t('Хореографы')}</h1>
            <button className={s.addBtn} onClick={onAdd}>
                {t('+ Добавить хореографа')}
            </button>
        </div>
    );
};

const ChoreographersEmptyState = ({ onAdd }: { onAdd: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.emptyState}>
            <div className={s.emptyTitle}>{t('Хореографов пока нет')}</div>
            <div className={s.emptyText}>{t('Добавьте первого преподавателя студии')}</div>
            <button className={s.addBtn} onClick={onAdd}>
                {t('+ Добавить хореографа')}
            </button>
        </div>
    );
};

const ChoreographersGrid = ({ choreographers, onEdit, onDelete }: {
    choreographers: Choreographer[];
    onEdit: (c: Choreographer) => void;
    onDelete: (id: number) => void;
}) => (
    <div className={s.grid}>
        {choreographers.map((c) => (
            <ChoreographerCard
                key={c.id}
                choreographer={c}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        ))}
    </div>
);

const ChoreographersPage = memo(() => {
    const {
        loading, modalOpen, editChoreographer, filteredChoreographers,
        fetchChoreographers, onAdd, onEdit, onClose, onDelete,
    } = useChoreographersPage();

    return (
        <Page>
            <ChoreographersHeader onAdd={onAdd} />

            {loading ? (
                <div className={s.empty}>Загрузка...</div>
            ) : filteredChoreographers.length === 0 ? (
                <ChoreographersEmptyState onAdd={onAdd} />
            ) : (
                <ChoreographersGrid choreographers={filteredChoreographers} onEdit={onEdit} onDelete={onDelete} />
            )}

            <ChoreographerModal
                isOpen={modalOpen}
                onClose={onClose}
                onSaved={fetchChoreographers}
                editChoreographer={editChoreographer}
            />
        </Page>
    );
});

export default ChoreographersPage;
