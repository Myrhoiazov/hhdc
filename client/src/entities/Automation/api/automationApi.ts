import { postData, readData, readPage } from '@/shared/api/request';
import { AutomationRun, Automation, AutomationInput, AutomationTest } from '../model/types';

export const getAutomationMeta = async () =>
    readData<{ triggers: string[]; actions: string[] }>('/automations/meta');

export const listAutomations = async () => readPage<Automation>('/automations');

export const createAutomation = async (input: AutomationInput) =>
    postData<Automation>('/automations', input);

export const setAutomationStatus = async (id: string, action: 'activate' | 'pause' | 'archive') =>
    postData<Automation>(`/automations/${id}/${action}`);

export const testAutomation = async (id: string, payload: Record<string, string>) =>
    postData<AutomationTest>(`/automations/${id}/test`, { payload });

export const listAutomationRuns = async (id: string) =>
    readPage<AutomationRun>(`/automations/${id}/runs`);
