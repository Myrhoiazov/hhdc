import { postData, readData } from '@/shared/api/request';
import { AssistantAnswer, ReviewQueue } from '../model/types';

export const askAssistant = async (question: string) =>
    postData<AssistantAnswer>('/ai/assistant', { question });

export const decideProposal = async (id: string, decision: 'confirm' | 'reject') =>
    postData<unknown>(`/ai/actions/${id}/${decision}`);

export const getReviewQueue = async () => readData<ReviewQueue>('/ai/review-queue');
