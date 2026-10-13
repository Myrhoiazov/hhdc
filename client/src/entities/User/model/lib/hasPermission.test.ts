import { hasPermission } from './hasPermission';

test('a permission the user holds is granted', () => {
    expect(hasPermission(['people.write', 'finance.read'], 'finance.read')).toBe(true);
});

test('a permission the user does not hold is refused', () => {
    expect(hasPermission(['people.write'], 'finance.read')).toBe(false);
});

test('nobody signed in holds nothing', () => {
    expect(hasPermission(undefined, 'finance.read')).toBe(false);
});
