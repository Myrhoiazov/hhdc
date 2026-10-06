import { TransactionCategory } from '@/entities/TransactionCategory';
import { mapExpenseCategoryToEnum } from './mapExpenseCategoryToEnum';

describe('mapExpenseCategoryToEnum', () => {
    test.each([
        [TransactionCategory.HUIS, 'HUIS'],
        [TransactionCategory.HEALTH, 'HEALTH'],
        [TransactionCategory.AUTO, 'AUTO'],
        [TransactionCategory.PRODUCTS, 'PRODUCTS'],
        [TransactionCategory.PHARMACY, 'PHARMACY'],
        [TransactionCategory.OTHER, 'OTHER'],
    ])('maps %s to %s', (category, expected) => {
        expect(mapExpenseCategoryToEnum(category)).toBe(expected);
    });

    test('defaults to KOMUNALKA for an unrecognized or missing category', () => {
        expect(mapExpenseCategoryToEnum(undefined)).toBe('KOMUNALKA');
        expect(mapExpenseCategoryToEnum(TransactionCategory.KOMUNALKA)).toBe('KOMUNALKA');
    });
});
