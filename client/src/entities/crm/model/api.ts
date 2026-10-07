import { $apiPrivate } from '@/shared/api/api';
import { Activity, Event, Person, PersonRole, PageResult } from './types';

const read = async <T,>(path: string) => (await $apiPrivate.get<{ data: T }>(path)).data.data;
const list = async <T,>(path: string): Promise<PageResult<T>> => {
    const result = (await $apiPrivate.get<{ data: T[]; meta: { total: number } }>(path)).data;
    return { data: result.data, total: result.meta.total };
};

export const listPeople = async (search = '') =>
    list<Person>(`/people?search=${encodeURIComponent(search)}&pageSize=100`);
export const getPerson = async (id: string) => read<Person>(`/people/${id}`);
export const savePerson = async (input: Partial<Person>, id?: string) =>
    (await (id ? $apiPrivate.patch<{data: Person}>(`/people/${id}`, input) : $apiPrivate.post<{data: Person}>('/people', input))).data.data;
export const addPersonRole = async (id: string, role: PersonRole) =>
    (await $apiPrivate.post(`/people/${id}/roles`, { role })).data;
export const getPersonActivity = async (id: string) =>
    list<Activity>(`/people/${id}/activity`);
export const listEvents = async () => list<Event>('/events');
export const getEvent = async (id: string) => read<Event>(`/events/${id}`);
export const createEvent = async (input: Partial<Event>) =>
    (await $apiPrivate.post<{data: Event}>('/events', input)).data.data;
export const registerPerson = async (eventId: string, personId: string) =>
    (await $apiPrivate.post(`/events/${eventId}/registrations`, { personId, status: 'CONFIRMED' })).data;
export const assignChoreographer = async (eventId: string, personId: string) =>
    (await $apiPrivate.post(`/events/${eventId}/choreographers`, { personId, roleTitle: 'Choreographer', status: 'CONFIRMED' })).data;
export const getDashboard = async () => read<Record<string, number>>('/dashboard');
export const listAudit = async () => list<Record<string, string>>('/audit');
export const listUsers = async () => list<{id: string; name: string; email: string; isActive: boolean; roles: {role: {key: string}}[]}>('/users');
export const createUser = async (input: {name: string; email: string; password: string; roles: string[]}) => $apiPrivate.post('/users', input);
export const updateUser = async (id: string, input: {isActive: boolean}) => $apiPrivate.patch(`/users/${id}`, input);
