import { DanceGroup } from '@/entities/DanceGroup';

export const DAYS = [
    { key: 'Понедельник', short: 'ПН' },
    { key: 'Вторник', short: 'ВТ' },
    { key: 'Среда', short: 'СР' },
    { key: 'Четверг', short: 'ЧТ' },
    { key: 'Пятница', short: 'ПТ' },
    { key: 'Суббота', short: 'СБ' },
    { key: 'Воскресенье', short: 'ВС' },
];

export const startOfWeek = (date: Date) => {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(0, 0, 0, 0);
    return result;
};

export const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const formatShortDate = (date: Date) => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
export const formatDate = (date: Date) => date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const personName = (group: DanceGroup) => `${group.choreographer.firstName} ${group.choreographer.lastName}`;
export const levelLabel: Record<DanceGroup['level'], string> = {
    START: 'Start',
    FAN: 'Fan',
    PRO: 'Pro',
};
export const searchLink = (path: string, value: string) => `${path}?_q=${encodeURIComponent(value)}`;

export interface ScheduleEntry {
    group: DanceGroup;
    startTime: string;
    endTime: string;
}

export const buildTimeSlots = (groups: DanceGroup[]) => Array.from(new Set(
    groups.flatMap((group) => group.slots.map((slot) => slot.startTime)),
)).sort();

export const buildScheduleMap = (groups: DanceGroup[]) => {
    const result = new Map<string, ScheduleEntry[]>();
    groups.forEach((group) => group.slots.forEach((slot) => {
        const key = `${slot.startTime}-${slot.dayOfWeek}`;
        result.set(key, [...(result.get(key) ?? []), { group, startTime: slot.startTime, endTime: slot.endTime }]);
    }));
    return result;
};

export const buildFilterOptions = (groups: DanceGroup[]) => ({
    choreographers: Array.from(new Set(groups.map(personName))).sort(),
    styles: Array.from(new Set(groups.map((group) => group.style))).sort(),
    branches: Array.from(new Set(groups.map((group) => group.branch?.name).filter(Boolean) as string[])).sort(),
});