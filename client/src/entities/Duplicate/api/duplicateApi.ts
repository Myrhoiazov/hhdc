import { postData, readPage } from '@/shared/api/request';
import { DuplicateCandidate } from '../model/types';

export const listDuplicates = async () => readPage<DuplicateCandidate>('/duplicates');

export const scanDuplicates = async () =>
    postData<{ scanned: number; created: number }>('/duplicates/scan');

export const resolveDuplicate = async (id: string, status: 'NOT_DUPLICATE' | 'IGNORED') =>
    postData<unknown>(`/duplicates/${id}/resolve`, { status });

export const mergePeople = async (targetId: string, sourcePersonId: string) =>
    postData<unknown>(`/people/${targetId}/merge`, { sourcePersonId, fieldDecisions: {} });
