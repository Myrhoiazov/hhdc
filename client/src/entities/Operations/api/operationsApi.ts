import { $apiPrivate } from '@/shared/api/api';
import { postData, readData } from '@/shared/api/request';
import { OperationsHealth, Task, CheckinResult } from '../model/types';

export const getOperationsHealth = async () => readData<OperationsHealth>('/operations/health');

export const listTasks = async () => readData<Task[]>('/tasks');

export const updateTaskStatus = async (id: string, status: string) =>
    $apiPrivate.patch(`/tasks/${id}`, { status });

export const checkIn = async (code: string, eventId?: string) =>
    postData<CheckinResult>('/check-in/event-entry', { code, eventId: eventId || undefined });
