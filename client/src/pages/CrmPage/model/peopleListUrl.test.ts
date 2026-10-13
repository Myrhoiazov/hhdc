import { peopleListPath, readPeopleList, writePeopleList } from './peopleListUrl';

jest.mock('@/entities/crm', () => ({ PERSON_ROLES: ['CUSTOMER', 'PARTICIPANT', 'CHOREOGRAPHER', 'STAFF', 'PARTNER'], PERSON_SOURCES: ['WEEZTIX', 'EMAIL', 'MANUAL', 'IMPORT', 'SYSTEM'] }));

const NO_FILTERS = { q: '', role: '', source: '', purchases: '' } as const;

test('the plain list has the plain address and is read back from it', () => {
    expect(writePeopleList(NO_FILTERS, 1)).toBe('');
    expect(readPeopleList(new URLSearchParams(''))).toEqual({ filters: NO_FILTERS, page: 1 });
});

test('filters and the page survive the way into the address and back', () => {
    const filters = { q: 'anna berg', role: 'STAFF', source: 'EMAIL', purchases: 'no' } as const;
    const address = writePeopleList(filters, 7);

    expect(address).toBe('q=anna+berg&role=STAFF&source=EMAIL&purchases=no&page=7');
    expect(readPeopleList(new URLSearchParams(address))).toEqual({ filters, page: 7 });
});

test('values the list does not know are dropped instead of being sent to the server', () => {
    const read = readPeopleList(new URLSearchParams('role=ADMIN&source=nowhere&purchases=maybe&page=-3'));
    expect(read).toEqual({ filters: NO_FILTERS, page: 1 });
    expect(readPeopleList(new URLSearchParams('page=abc')).page).toBe(1);
});

test('the way back is the list the contact was opened from, and the plain list otherwise', () => {
    expect(peopleListPath({ peopleList: '/people?page=3' })).toBe('/people?page=3');
    expect(peopleListPath(null)).toBe('/people');
    expect(peopleListPath({ peopleList: 'https://elsewhere.test' })).toBe('/people');
});
