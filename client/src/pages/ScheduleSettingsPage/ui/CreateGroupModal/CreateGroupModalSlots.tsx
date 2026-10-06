import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScheduleSlot } from '@/entities/DanceGroup';
import { SlotRow } from './SlotRow';
import s from './CreateGroupModal.module.scss';

interface CreateGroupModalSlotsProps {
    slots: ScheduleSlot[];
    onAddSlot: () => void;
    onUpdateSlot: (idx: number, field: keyof ScheduleSlot, value: string) => void;
    onRemoveSlot: (idx: number) => void;
}

export const CreateGroupModalSlots = memo((props: CreateGroupModalSlotsProps) => {
    const { t } = useTranslation();

    return (
        <div className={s.slotsBox}>
            <div className={s.slotsHeader}>
                <label className={s.label}>
                    {t('Слоты расписания')} <span className={s.req}>*</span>
                </label>
                <button type="button" className={s.addSlotBtn} onClick={props.onAddSlot}>
                    {t('+ Добавить слот')}
                </button>
            </div>
            {props.slots.map((slot, idx) => (
                <SlotRow
                    key={idx}
                    slot={slot}
                    idx={idx}
                    removable={props.slots.length > 1}
                    onUpdate={props.onUpdateSlot}
                    onRemove={props.onRemoveSlot}
                />
            ))}
        </div>
    );
});
