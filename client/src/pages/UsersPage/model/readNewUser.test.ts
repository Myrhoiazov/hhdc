import { readNewUser } from './readNewUser';

test('a new staff user comes with one role', () => {
    const form = new FormData();
    form.set('name', 'Anna Lee');
    form.set('email', 'anna@example.test');
    form.set('password', 'secret-2026');
    form.set('role', 'MANAGER');

    expect(readNewUser(form)).toEqual({
        name: 'Anna Lee',
        email: 'anna@example.test',
        password: 'secret-2026',
        roles: ['MANAGER'],
    });
});
