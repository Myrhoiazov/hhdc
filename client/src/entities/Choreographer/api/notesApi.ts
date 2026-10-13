import { deleteData, patchData, postData, readData } from '@/shared/api/request';
import { ChoreographerNote, ChoreographerTask } from '../model/notes';

export const listChoreographerNotes = async (personId: string) =>
    readData<ChoreographerNote[]>(`/choreographers/${personId}/notes`);

export const addChoreographerNote = async (personId: string, content: string, isPinned = false) =>
    postData<ChoreographerNote>(`/choreographers/${personId}/notes`, { content, isPinned });

export const updateChoreographerNote = async (
    personId: string,
    noteId: string,
    input: { content?: string; isPinned?: boolean }
) => patchData<ChoreographerNote>(`/choreographers/${personId}/notes/${noteId}`, input);

export const removeChoreographerNote = async (personId: string, noteId: string) =>
    deleteData<{ deleted: boolean }>(`/choreographers/${personId}/notes/${noteId}`);

export const listChoreographerTasks = async (personId: string) =>
    readData<ChoreographerTask[]>(`/choreographers/${personId}/tasks`);

export const addChoreographerTask = async (
    personId: string,
    input: { title: string; dueDate?: string | null; priority?: string }
) => postData<ChoreographerTask>(`/choreographers/${personId}/tasks`, input);
