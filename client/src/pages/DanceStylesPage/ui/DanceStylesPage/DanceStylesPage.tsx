import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { getStyleColorSlot } from '@/shared/lib/styleColor/styleColor';
import { useDanceStyles, DanceStyle } from '../../useDanceStyles';
import { DanceStyleFormModal } from './DanceStyleFormModal';
import s from './DanceStylesPage.module.scss';

const DanceStylesHeader = ({ onAdd }: { onAdd: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.header}>
            <h1>{t('Стили / направления')}</h1>
            <button className={s.cta} onClick={onAdd}>{t('+ Добавить стиль')}</button>
        </div>
    );
};

const DanceStylesFilters = ({
    search, onSearchChange,
    status, onStatusChange,
    sort, onSortChange,
    onReset,
    itemsCount,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    sort: string;
    onSortChange: (value: string) => void;
    onReset: () => void;
    itemsCount: number;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.filters}>
            <label>{t('Поиск')}<input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="По названию или описанию" /></label>
            <label>{t('Статус')}<select value={status} onChange={(e) => onStatusChange(e.target.value)}><option value="all">{t('Все')}</option><option value="active">{t('Включены')}</option><option value="inactive">{t('Выключены')}</option></select></label>
            <label>{t('Сортировка')}<select value={sort} onChange={(e) => onSortChange(e.target.value)}><option value="name-asc">{t('По алфавиту: А → Я')}</option><option value="name-desc">{t('По алфавиту: Я → А')}</option><option value="newest">{t('Сначала новые')}</option></select></label>
            <button className={s.reset} onClick={onReset}>{t('Сбросить')}</button>
            <span className={s.count}>{t('Показано: {{shown}}', { shown: `${itemsCount}` })}</span>
        </section>
    );
};

const DanceStyleCard = ({ item, onToggle, onEdit, onRemove }: {
    item: DanceStyle;
    onToggle: (item: DanceStyle) => void;
    onEdit: (item: DanceStyle) => void;
    onRemove: (item: DanceStyle) => void;
}) => {
    const { t } = useTranslation();
    return (
        <article className={s.card} key={item.id}>
            <div className={s.photo}>{item.image ? <img src={item.image} alt={item.name} /> : <span>{t('Нет фото')}</span>}</div>
            <div className={s.cardTitle}><span className={`${s.swatch} ${s[`style${getStyleColorSlot(item.name)}`]}`} title="Цвет в расписании" /><h2>{item.name}</h2><button className={`${s.switch} ${item.isActive ? s.on : ''}`} onClick={() => onToggle(item)}><span /></button><small>{item.isActive ? 'Вкл' : 'Выкл'}</small></div>
            <p>{item.description || 'Описание пока не добавлено.'}</p>
            {item.content && <p>{item.content}</p>}
            {item.youtubeUrl && <a href={item.youtubeUrl} target="_blank" rel="noreferrer">{t('YouTube')}</a>}
            <div className={s.actions}>
                {item.youtubeUrl && <a className={s.iconBtn} href={item.youtubeUrl} target="_blank" rel="noreferrer">↗</a>}
                <button className={s.iconBtn} onClick={() => onEdit(item)}>{t('✎')}</button>
                <button className={`${s.iconBtn} ${s.delete}`} onClick={() => onRemove(item)}>{t('⌫')}</button>
            </div>
        </article>
    );
};

const DanceStylesGrid = ({ items, onToggle, onEdit, onRemove }: {
    items: DanceStyle[];
    onToggle: (item: DanceStyle) => void;
    onEdit: (item: DanceStyle) => void;
    onRemove: (item: DanceStyle) => void;
}) => (
    <div className={s.grid}>
        {items.map((item) => (
            <DanceStyleCard key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />
        ))}
    </div>
);

const DanceStylesPage = memo(() => {
    const { t } = useTranslation();
    const {
        items, search, setSearch, status, setStatus, sort, setSort, loading,
        modalOpen, setModalOpen, editingId, lang, setLang, form, saving,
        openCreate, openEdit, updateField, uploadImage, save, remove, toggle, resetFilters,
    } = useDanceStyles();

    return (
        <Page>
            <DanceStylesHeader onAdd={openCreate} />

            <DanceStylesFilters
                search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus}
                sort={sort} onSortChange={setSort} onReset={resetFilters} itemsCount={items.length}
            />

            {loading ? <div className={s.empty}>Загружаем стили...</div> : !items.length ? <div className={s.empty}>{t('Стили пока не добавлены.')}</div> : (
                <DanceStylesGrid items={items} onToggle={toggle} onEdit={openEdit} onRemove={remove} />
            )}

            <DanceStyleFormModal
                isOpen={modalOpen} isEditing={editingId !== undefined} lang={lang} form={form} saving={saving}
                onClose={() => setModalOpen(false)} onLangChange={setLang} onFieldChange={updateField}
                onUploadImage={uploadImage} onSave={save}
            />
        </Page>
    );
});

export default DanceStylesPage;
