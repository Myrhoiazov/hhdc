import { PaymentMethod } from '@/entities/PaymentMethod';
import { mapPaymentMethodToEnum } from './mapPaymentMethodToEnum';

describe('mapPaymentMethodToEnum', () => {
    test('maps CARD to card', () => {
        expect(mapPaymentMethodToEnum(PaymentMethod.CARD)).toBe('card');
    });

    test('maps BANK_TRANSFER to bank_transfer', () => {
        expect(mapPaymentMethodToEnum(PaymentMethod.BANK_TRANSFER)).toBe('bank_transfer');
    });

    test('defaults to cash for CASH or a missing method', () => {
        expect(mapPaymentMethodToEnum(PaymentMethod.CASH)).toBe('cash');
        expect(mapPaymentMethodToEnum(undefined)).toBe('cash');
    });
});
