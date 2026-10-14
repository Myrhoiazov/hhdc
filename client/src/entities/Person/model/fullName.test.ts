import { fullNameOf } from './fullName';

test('the name a person goes by comes first', () => {
    expect(fullNameOf({ displayName: 'Jojo', firstName: 'Joanna', lastName: 'Gomez' })).toBe('Jojo');
});

test('without it the first and last names are joined', () => {
    expect(fullNameOf({ firstName: 'Joanna', lastName: 'Gomez' })).toBe('Joanna Gomez');
    expect(fullNameOf({ displayName: '', firstName: 'Joanna', lastName: '' })).toBe('Joanna');
});

test('a person without any name has an empty one', () => {
    expect(fullNameOf({ firstName: '', lastName: '' })).toBe('');
});
