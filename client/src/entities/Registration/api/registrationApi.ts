import { $apiPrivate } from '@/shared/api/api';
import { readPage } from '@/shared/api/request';
import { EventRegistration, REGISTRATIONS_PAGE_SIZE, RegistrationFilters } from '../model/types';

export const listEventRegistrations = async (
    eventId: string,
    filters: RegistrationFilters,
    page: number
) =>
    readPage<EventRegistration>(
        `/events/${eventId}/registrations?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(REGISTRATIONS_PAGE_SIZE) }).toString()}`
    );

export const registerPerson = async (eventId: string, personId: string) =>
    (await $apiPrivate.post(`/events/${eventId}/registrations`, { personId, status: 'CONFIRMED' }))
        .data;
