import { $apiPrivate } from '@/shared/api/api';
import { Activity, Event, Person, PersonRole, PageResult } from './types';

const read = async <T,>(path: string) => (await $apiPrivate.get<{ data: T }>(path)).data.data;
const list = async <T,>(path: string): Promise<PageResult<T>> => {
    const result = (await $apiPrivate.get<{ data: T[]; meta: { total: number } }>(path)).data;
    return { data: result.data, total: result.meta.total };
};

// Rows on one page of a list page (people, events).
export const LIST_PAGE_SIZE = 25;

// The server reads the search text from `q`.
export const listPeople = async (search = '') =>
    list<Person>(`/people?q=${encodeURIComponent(search)}&pageSize=100`);

export const PERSON_SOURCES = ['WEEZTIX', 'EMAIL', 'MANUAL', 'IMPORT', 'SYSTEM'] as const;
export type PersonSource = typeof PERSON_SOURCES[number];
export interface PeopleFilters { q: string; role: PersonRole | ''; source: PersonSource | ''; purchases: 'yes' | 'no' | '' }
export const listPeoplePage = async (filters: PeopleFilters, page: number) =>
    list<Person>(`/people?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`);
export const getPerson = async (id: string) => read<Person>(`/people/${id}`);
export const savePerson = async (input: Partial<Person>, id?: string) =>
    (await (id ? $apiPrivate.patch<{data: Person}>(`/people/${id}`, input) : $apiPrivate.post<{data: Person}>('/people', input))).data.data;
export const deletePerson = async (id: string) => { await $apiPrivate.delete(`/people/${id}`); };
export const addPersonRole = async (id: string, role: PersonRole) =>
    (await $apiPrivate.post(`/people/${id}/roles`, { role })).data;
export const getPersonActivity = async (id: string) =>
    list<Activity>(`/people/${id}/activity`);
export const listEvents = async () => list<Event>('/events');
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
export interface EventFilters { q: string; status: typeof EVENT_STATUSES[number] | ''; period: 'upcoming' | 'past' | '' }
export const listEventsPage = async (filters: EventFilters, page: number) =>
    list<Event>(`/events?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`);
export const getEvent = async (id: string) => read<Event>(`/events/${id}`);
export interface TicketType { id: string; name: string; description: string | null; price: string; currency: string; status: string; availableFrom: string | null; availableUntil: string | null; soldCount: number }
export const listTicketTypes = async (eventId: string) => read<TicketType[]>(`/events/${eventId}/ticket-types`);
export interface SalesLine { name: string; tickets: number; revenue: string }
export interface EventSales {
    currency: string; tickets: number; withdrawn: number; orders: number; buyers: number; revenue: string; discount: string;
    byType: SalesLine[]; byMonth: SalesLine[]; coupons: { name: string; tickets: number; discount: string }[];
}
export const getEventSales = async (eventId: string) => read<EventSales>(`/events/${eventId}/sales`);
export interface PersonTicket {
    id: string; ticketType: string; barcode: string | null; status: string; price: string | null; listPrice: string | null; serviceFee: string | null;
    couponCode: string | null; downloadUrl: string | null; event: { id: string; name: string } | null; checkedIn: boolean; heldByPerson: boolean;
}
export interface PersonOrder {
    id: string; externalId: string | null; status: string; currency: string; subtotal: string | null; fees: string | null; total: string | null; orderedAt: string;
    shopName: string | null; answers: { name: string; value: string }[]; downloadUrl: string | null; event: { id: string; name: string } | null; boughtByPerson: boolean;
    tickets: PersonTicket[]; payments: { id: string; amount: string | null; currency: string; status: string; method: string | null; paidAt: string | null }[];
}
export const listPersonOrders = async (personId: string) => read<PersonOrder[]>(`/people/${personId}/orders`);
export const createEvent = async (input: Partial<Event>) =>
    (await $apiPrivate.post<{data: Event}>('/events', input)).data.data;
export const REGISTRATION_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'] as const;
export interface EventRegistration {
    id: string; status: string; registrationSource: string; createdAt: string;
    person: { id: string; displayName: string; firstName: string; lastName: string; email: string | null; phone: string | null; country: string | null };
    ticket: { ticketType: string; status: string } | null;
}
export interface RegistrationFilters { q: string; status: typeof REGISTRATION_STATUSES[number] | '' }
export const listEventRegistrations = async (eventId: string, filters: RegistrationFilters, page: number) =>
    list<EventRegistration>(`/events/${eventId}/registrations?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`);
export const registerPerson = async (eventId: string, personId: string) =>
    (await $apiPrivate.post(`/events/${eventId}/registrations`, { personId, status: 'CONFIRMED' })).data;
export const assignChoreographer = async (eventId: string, personId: string) =>
    (await $apiPrivate.post(`/events/${eventId}/choreographers`, { personId, roleTitle: 'Choreographer', status: 'CONFIRMED' })).data;
export interface MoneyTotals { tickets: number; revenue: string; discount: string; costs: string; result: string }
export interface EventMoney extends MoneyTotals { id: string; name: string; startAt: string }
export interface YearMoney extends MoneyTotals { year: number; events: EventMoney[] }
export interface CountryRow { code: string; buyers: number; tickets: number; revenue: string }
export interface DashboardInsights {
    currency: string; totals: { revenue: string; costs: string; result: string; tickets: number; buyers: number; events: number };
    years: YearMoney[]; countries: CountryRow[]; notGiven: number; notRecognised: number;
}
export const getDashboardInsights = async () => read<DashboardInsights>('/dashboard/insights');
export const EVENT_EXPENSE_CATEGORIES = ['FEE', 'SALARY', 'TRAVEL', 'HOTEL', 'VENUE', 'MARKETING', 'EQUIPMENT', 'OTHER'] as const;
export type EventExpenseCategory = typeof EVENT_EXPENSE_CATEGORIES[number];
export type ExpenseStatus = 'PLANNED' | 'PAID' | 'CANCELLED';
// `source` tells where the line is kept: on the event, or on a choreographer's card (shown here, changed there).
export interface ExpenseLine {
    id: string; source: 'EVENT' | 'CHOREOGRAPHER_EXPENSE' | 'CHOREOGRAPHER_FEE'; category: string; description: string | null; amount: string; currency: string; status: string;
    date: string | null; person: { id: string; displayName: string } | null; event?: { id: string; name: string };
}
export interface ExpenseList { lines: ExpenseLine[]; totals: { total: string; paid: string; planned: string; byCategory: { category: string; amount: string }[] } }
export interface EventExpenseInput { category: EventExpenseCategory; amount: string; description?: string | null; expenseDate?: string | null; personId?: string | null; status?: ExpenseStatus }
export const listEventExpenses = async (eventId: string) => read<ExpenseList>(`/events/${eventId}/expenses`);
export const listPersonExpenses = async (personId: string) => read<ExpenseList>(`/people/${personId}/expenses`);
export const createEventExpense = async (eventId: string, input: EventExpenseInput) => (await $apiPrivate.post<{ data: ExpenseLine }>(`/events/${eventId}/expenses`, input)).data.data;
export const updateEventExpense = async (eventId: string, expenseId: string, change: Partial<EventExpenseInput>) =>
    (await $apiPrivate.patch<{ data: ExpenseLine }>(`/events/${eventId}/expenses/${expenseId}`, change)).data.data;
export const getDashboard = async () => read<Record<string, number>>('/dashboard');
export interface AuditEntry {
    id: string; action: string; entityType: string; entityId: string | null; ipAddress: string | null; createdAt: string;
    actor: { id: string; name: string; email: string } | null;
}
export interface AuditFilters { q: string; entityType: string; actorUserId: string; from: string; to: string }
export interface AuditOptions { entityTypes: string[]; actors: { id: string; name: string; email: string }[] }
export const listAuditPage = async (filters: AuditFilters, page: number) =>
    list<AuditEntry>(`/audit?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`);
export const getAuditOptions = async () => read<AuditOptions>('/audit/options');
export const listUsers = async () => list<{id: string; name: string; email: string; isActive: boolean; roles: {role: {key: string}}[]}>('/users');
export const createUser = async (input: {name: string; email: string; password: string; roles: string[]}) => $apiPrivate.post('/users', input);
export const updateUser = async (id: string, input: {isActive: boolean}) => $apiPrivate.patch(`/users/${id}`, input);
