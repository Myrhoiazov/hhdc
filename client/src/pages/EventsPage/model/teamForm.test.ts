import { money, readMember } from './teamForm';

const formOf = (fields: Record<string, string>) => {
    const form = new FormData();
    Object.entries(fields).forEach(([name, value]) => form.set(name, value));
    return form;
};

test('an amount written with a comma is read with a point', () => {
    expect(money(formOf({ amount: ' 250,50 ' }))).toBe('250.50');
});

test('a member with pay carries the amount', () => {
    expect(
        readMember(
            formOf({
                personId: 'p1',
                roleTitle: ' Videographer ',
                duties: '',
                personRole: 'STAFF',
                amount: '300',
            })
        )
    ).toEqual({
        personId: 'p1',
        roleTitle: 'Videographer',
        duties: null,
        personRole: 'STAFF',
        amount: '300',
    });
});

test('a member without pay has no amount at all', () => {
    expect(
        readMember(
            formOf({
                personId: 'p1',
                roleTitle: 'Host',
                duties: 'Desk',
                personRole: 'PARTNER',
                amount: '',
            })
        )
    ).not.toHaveProperty('amount');
});
