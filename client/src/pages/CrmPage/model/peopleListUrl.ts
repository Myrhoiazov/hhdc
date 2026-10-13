import { PeopleFilters, PERSON_ROLES, PERSON_SOURCES } from '@/entities/crm';

// The filters and the page of the people list live in the address, so that coming back from a
// contact — by the back link or by the browser — opens the list where it was left.
export const PEOPLE_PATH = '/people';

const PURCHASES = ['yes', 'no'] as const;

// The address is typed by hand as well: a value the list does not know is no filter at all.
const oneOf = <Value extends string>(value: string | null, allowed: readonly Value[]): Value | '' =>
    allowed.find(item => item === value) ?? '';

export const readPeopleList = (params: URLSearchParams): { filters: PeopleFilters; page: number } => ({
    filters: {
        q: params.get('q') ?? '',
        role: oneOf(params.get('role'), PERSON_ROLES),
        source: oneOf(params.get('source'), PERSON_SOURCES),
        purchases: oneOf(params.get('purchases'), PURCHASES),
    },
    page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
});

// Only what differs from the plain list is written, so the plain list keeps the plain address.
export const writePeopleList = (filters: PeopleFilters, page: number) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (page > 1) params.set('page', String(page));
    return params.toString();
};

// Where the back link of a contact leads: the list it was opened from, or the plain list.
export const peopleListPath = (state: unknown) => {
    const from = (state as { peopleList?: unknown } | null)?.peopleList;
    return typeof from === 'string' && from.startsWith(PEOPLE_PATH) ? from : PEOPLE_PATH;
};
