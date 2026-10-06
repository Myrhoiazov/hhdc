import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { statusLabel } from '../../model/consts';
import s from './InvoicesPage.module.scss';

const statusFilterValues = ['ALL', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'DRAFT', 'CANCELLED'] as const;

interface InvoicesPageToolbarProps {
    query: string;
    appliedQuery: string;
    status: string;
    onQueryChange: (value: string) => void;
    onApplySearch: () => void;
    onResetSearch: () => void;
    onStatusChange: (value: string) => void;
    onOpenCreateModal: (paidMode: boolean) => void;
}

const HeaderActions = ({ onOpenCreateModal }: { onOpenCreateModal: (paidMode: boolean) => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.headerActions}>
            <button className={s.paidCreate} onClick={() => onOpenCreateModal(true)}>
                {t('+ Черновик оплаченного')}
            </button>
            <button className={s.create} onClick={() => onOpenCreateModal(false)}>
                {t('+ Создать инвойс')}
            </button>
        </div>
    );
};

const SearchBar = ({
    query,
    appliedQuery,
    onQueryChange,
    onApplySearch,
    onResetSearch,
}: {
    query: string;
    appliedQuery: string;
    onQueryChange: (value: string) => void;
    onApplySearch: () => void;
    onResetSearch: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <div className={s.search}>
            <input
                value={query}
                placeholder="Имя, email, номер инвойса или транзакции"
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') onApplySearch(); }}
                aria-label="Поиск инвойсов"
            />
            <button onClick={onApplySearch}>{t('Найти')}</button>
            {(query || appliedQuery) && <button onClick={onResetSearch}>{t('Сбросить')}</button>}
        </div>
    );
};

export const InvoicesPageToolbar = memo((props: InvoicesPageToolbarProps) => {
    const {
        query,
        appliedQuery,
        status,
        onQueryChange,
        onApplySearch,
        onResetSearch,
        onStatusChange,
        onOpenCreateModal,
    } = props;
    const { t } = useTranslation();

    return (
        <>
            <div className={s.header}>
                <div>
                    <h1>{t('Инвойсы')}</h1>
                    <p>{t('Надёжный учёт оплат, задолженности и корректировок')}</p>
                </div>
                <HeaderActions onOpenCreateModal={onOpenCreateModal} />
            </div>

            <SearchBar
                query={query}
                appliedQuery={appliedQuery}
                onQueryChange={onQueryChange}
                onApplySearch={onApplySearch}
                onResetSearch={onResetSearch}
            />

            <div className={s.filters} role="group" aria-label="Фильтр по статусу">
                {statusFilterValues.map((value) => (
                    <button
                        key={value}
                        className={status === value ? s.active : ''}
                        onClick={() => onStatusChange(value)}
                        aria-pressed={status === value}
                    >
                        {value === 'ALL' ? 'Все' : statusLabel[value]}
                    </button>
                ))}
            </div>
        </>
    );
});
