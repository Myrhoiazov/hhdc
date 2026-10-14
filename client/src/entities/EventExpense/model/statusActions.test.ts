import { nextExpenseActions } from './statusActions';

test('a planned expense is paid or cancelled', () => {
    expect(nextExpenseActions('PLANNED')).toEqual([
        ['PAID', 'Mark paid'],
        ['CANCELLED', 'Cancel expense'],
    ]);
});

test('a paid expense can only be cancelled, and a cancelled one restored', () => {
    expect(nextExpenseActions('PAID')).toEqual([['CANCELLED', 'Cancel expense']]);
    expect(nextExpenseActions('CANCELLED')).toEqual([['PLANNED', 'Restore']]);
});

test('an unknown status offers nothing', () => {
    expect(nextExpenseActions('ARCHIVED')).toEqual([]);
});
