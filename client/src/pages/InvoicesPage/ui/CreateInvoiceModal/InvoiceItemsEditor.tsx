import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvoiceGroup } from '../../model/types';
import { FormItem } from './useCreateInvoiceModal';
import s from './CreateInvoiceModal.module.scss';

interface InvoiceItemsEditorProps {
    items: FormItem[];
    groups: InvoiceGroup[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onSelectGroup: (index: number, value: string) => void;
    onUpdateItem: (index: number, patch: Partial<FormItem>) => void;
}

export const InvoiceItemsEditor = memo((props: InvoiceItemsEditorProps) => {
    const { t } = useTranslation();
    const { items, groups, onAdd, onRemove, onSelectGroup, onUpdateItem } = props;

    return (
        <>
            <div className={s.itemsHeader}>
                <strong>{t('Занятия и услуги')}</strong>
                <button onClick={onAdd}>{t('+ Добавить строку')}</button>
            </div>
            <div className={s.items}>
                {items.map((item, index) => (
                    <div className={s.item} key={index}>
                        <select value={item.groupId} onChange={(event) => onSelectGroup(index, event.target.value)}>
                            <option value="">{t('Вручную')}</option>
                            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </select>
                        <input
                            className={s.description}
                            placeholder="Описание"
                            value={item.description}
                            onChange={(event) => onUpdateItem(index, { description: event.target.value })}
                        />
                        <input
                            placeholder="Период"
                            value={item.period}
                            onChange={(event) => onUpdateItem(index, { period: event.target.value })}
                        />
                        <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => onUpdateItem(index, { quantity: Number(event.target.value) })}
                        />
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.price}
                            onChange={(event) => onUpdateItem(index, { price: event.target.value })}
                        />
                        {items.length > 1 && (
                            <button className={s.remove} onClick={() => onRemove(index)}>×</button>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
});
