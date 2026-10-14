import { orderTone } from './orderTone';

test('a paid order is a success and an undone one a failure', () => {
    expect(orderTone('PAID')).toBe('success');
    expect(orderTone('CANCELLED')).toBe('danger');
    expect(orderTone('REFUNDED')).toBe('danger');
});

test('an order on its way is neutral', () => {
    expect(orderTone('PENDING')).toBeUndefined();
});
