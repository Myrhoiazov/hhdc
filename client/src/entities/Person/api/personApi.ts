import { $apiPrivate } from '@/shared/api/api';
import { patchData, postData, readData, readPage } from '@/shared/api/request';
import { LIST_PAGE_SIZE } from '@/shared/const/pagination';
import { PeopleFilters, PersonRole, Person, Activity } from '../model/types';

// The server reads the search text from `q`.
export const listPeople = async (search = '') =>
    readPage<Person>(`/people?q=${encodeURIComponent(search)}&pageSize=100`);

// People an expense can be paid to: choreographers, staff and partners.
export const listPayees = async (search = '') =>
    readPage<Person>(`/people?q=${encodeURIComponent(search)}&payees=yes&pageSize=100`);

export const listPeoplePage = async (filters: PeopleFilters, page: number) =>
    readPage<Person>(
        `/people?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`
    );

export const getPerson = async (id: string) => readData<Person>(`/people/${id}`);

export const savePerson = async (input: Partial<Person>, id?: string) =>
    id ? patchData<Person>(`/people/${id}`, input) : postData<Person>('/people', input);

export const deletePerson = async (id: string) => {
    await $apiPrivate.delete(`/people/${id}`);
};

export const addPersonRole = async (id: string, role: PersonRole) =>
    (await $apiPrivate.post(`/people/${id}/roles`, { role })).data;

export const removePersonRole = async (id: string, role: PersonRole) => {
    await $apiPrivate.delete(`/people/${id}/roles/${role}`);
};

export const getPersonActivity = async (id: string) => readPage<Activity>(`/people/${id}/activity`);
