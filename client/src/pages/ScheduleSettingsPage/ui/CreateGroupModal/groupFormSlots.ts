import { ScheduleSlot } from '@/entities/DanceGroup';

export const emptySlot = (): ScheduleSlot => ({ dayOfWeek: 'Понедельник', startTime: '', endTime: '' });
