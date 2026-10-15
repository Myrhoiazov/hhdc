import { patchData, postData, readData } from '@/shared/api/request';
import { AssignmentStatus, ChoreographerHistoryItem, AssignmentUpdate } from '../model/assignments';

export const listChoreographerHistory = async (personId: string) =>
    readData<ChoreographerHistoryItem[]>(`/choreographers/${personId}/events`);

// The event must already exist under Events; this works for past editions as well as upcoming ones.
export const assignChoreographerToEvent = async (
    personId: string,
    input: { eventId: string; roleTitle?: string; status?: AssignmentStatus }
) => postData<{ id: string }>(`/choreographers/${personId}/events`, input);

export const updateChoreographerAssignment = async (
    personId: string,
    assignmentId: string,
    input: AssignmentUpdate
) => patchData<{ id: string }>(`/choreographers/${personId}/events/${assignmentId}`, input);
