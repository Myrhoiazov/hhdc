import { deleteData, patchData, postData, readData } from '@/shared/api/request';
import { ChoreographerContact, ChoreographerContactInput } from '../model/contacts';

export const listChoreographerContacts = async (personId: string) =>
    readData<ChoreographerContact[]>(`/choreographers/${personId}/contacts`);

export const createChoreographerContact = async (
    personId: string,
    input: ChoreographerContactInput
) => postData<ChoreographerContact>(`/choreographers/${personId}/contacts`, input);

export const updateChoreographerContact = async (
    personId: string,
    contactId: string,
    input: Partial<ChoreographerContactInput>
) => patchData<ChoreographerContact>(`/choreographers/${personId}/contacts/${contactId}`, input);

// Deactivates instead of deleting: a former manager stays on record.
export const deactivateChoreographerContact = async (personId: string, contactId: string) =>
    deleteData<ChoreographerContact>(`/choreographers/${personId}/contacts/${contactId}`);
