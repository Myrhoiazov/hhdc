import { messageOf } from './messageOf';

test('the reason the server gave comes first', () => {
    const cause = Object.assign(new Error('Request failed with status code 400'), {
        response: { data: { error: { message: 'Amount must be positive' } } },
    });
    expect(messageOf(cause)).toBe('Amount must be positive');
});

test('an error without an answer of the server keeps its own message', () => {
    expect(messageOf(new Error('Network Error'))).toBe('Network Error');
});

test('anything else is a failed request', () => {
    expect(messageOf('boom')).toBe('Request failed');
});
