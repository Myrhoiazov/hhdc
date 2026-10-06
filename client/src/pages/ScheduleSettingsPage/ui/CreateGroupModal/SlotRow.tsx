import { memo } from 'react';
import { ScheduleSlot } from '@/entities/DanceGroup';
import s from './CreateGroupModal.module.scss';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

interface SlotRowProps {
    slot: ScheduleSlot;
    idx: number;
    removable: boolean;
    onUpdate: (idx: number, field: keyof ScheduleSlot, value: string) => void;
    onRemove: (idx: number) => void;
}

export const SlotRow = memo(({ slot, idx, removable, onUpdate, onRemove }: SlotRowProps) => {
    return (
        <div className={s.slotRow}>
            <select
                className={s.daySelect}
                value={slot.dayOfWeek}
                onChange={(e) => onUpdate(idx, 'dayOfWeek', e.target.value)}
            >
                {DAYS.map((d) => (
                    <option key={d} value={d}>
                        {d}
                    </option>
                ))}
            </select>
            <input
                className={s.timeInput}
                type="time"
                value={slot.startTime}
                onChange={(e) => onUpdate(idx, 'startTime', e.target.value)}
            />
            <input
                className={s.timeInput}
                type="time"
                value={slot.endTime}
                onChange={(e) => onUpdate(idx, 'endTime', e.target.value)}
            />
            {removable && (
                <button type="button" className={s.removeSlot} onClick={() => onRemove(idx)}>
                    ×
                </button>
            )}
        </div>
    );
});
