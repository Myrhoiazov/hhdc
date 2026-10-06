import { TransactionType } from '@/entities/TransactionType';
import { mapTransactionTypeToEnum } from './mapTransactionType';

describe('mapTransactionTypeToEnum', () => {
    test('maps INCOME to INCOME', () => {
        expect(mapTransactionTypeToEnum(TransactionType.INCOME)).toBe('INCOME');
    });

    test('maps EXPENSE to EXPENSE', () => {
        expect(mapTransactionTypeToEnum(TransactionType.EXPENSE)).toBe('EXPENSE');
    });

    test('defaults to INCOME for ALL or a missing type', () => {
        expect(mapTransactionTypeToEnum(TransactionType.ALL)).toBe('INCOME');
        expect(mapTransactionTypeToEnum(undefined)).toBe('INCOME');
    });
});
