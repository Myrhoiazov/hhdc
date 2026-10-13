import { isClient } from './isClient';
import { Person } from './types';

const personWith = (orders?: number): Person => ({
    id: '1',
    firstName: 'Anna',
    lastName: 'Lee',
    status: 'ACTIVE',
    roles: [],
    ...(orders === undefined ? {} : { _count: { orders } }),
});

test('a person with a purchase is a client', () => {
    expect(isClient(personWith(2))).toBe(true);
});

test('a person without purchases is not a client', () => {
    expect(isClient(personWith(0))).toBe(false);
    expect(isClient(personWith())).toBe(false);
});

test('nobody is not a client', () => {
    expect(isClient(null)).toBe(false);
    expect(isClient(undefined)).toBe(false);
});
