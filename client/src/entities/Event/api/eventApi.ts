import { $apiPrivate } from '@/shared/api/api';
import { postData, readData, readPage } from '@/shared/api/request';
import { LIST_PAGE_SIZE } from '@/shared/const/pagination';
import { EventFilters, TicketType, EventSales, Event } from '../model/types';

export const listEvents = async () => readPage<Event>('/events');

export const listEventsPage = async (filters: EventFilters, page: number) =>
    readPage<Event>(
        `/events?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`
    );

export const getEvent = async (id: string) => readData<Event>(`/events/${id}`);

export const listTicketTypes = async (eventId: string) =>
    readData<TicketType[]>(`/events/${eventId}/ticket-types`);

export const getEventSales = async (eventId: string) =>
    readData<EventSales>(`/events/${eventId}/sales`);

export const createEvent = async (input: Partial<Event>) => postData<Event>('/events', input);

export const assignChoreographer = async (eventId: string, personId: string) =>
    (
        await $apiPrivate.post(`/events/${eventId}/choreographers`, {
            personId,
            roleTitle: 'Choreographer',
            status: 'CONFIRMED',
        })
    ).data;
