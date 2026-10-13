import { postData, readData } from '@/shared/api/request';
import {
    PayoutStatus,
    FeeAgreement,
    ChoreographerExpense,
    PayoutRecord,
    ChoreographerFinance,
    ExpenseInput,
} from '../model/finance';

const ledger = '/choreographer-assignments';

export const getChoreographerFinance = async (personId: string) =>
    readData<ChoreographerFinance>(`/choreographers/${personId}/finance`);

export const recordFeeAgreement = async (
    assignmentId: string,
    input: { status: string; amount: string; currency: string; notes?: string }
) => postData<FeeAgreement>(`${ledger}/${assignmentId}/fee-agreements`, input);

export const cancelFeeAgreement = async (agreementId: string) =>
    postData<FeeAgreement>(`${ledger}/fee-agreements/${agreementId}/cancel`);

export const recordChoreographerExpense = async (assignmentId: string, input: ExpenseInput) =>
    postData<ChoreographerExpense>(`${ledger}/${assignmentId}/expenses`, input);

export const cancelChoreographerExpense = async (expenseId: string) =>
    postData<ChoreographerExpense>(`${ledger}/expenses/${expenseId}/cancel`);

export const recordPayout = async (
    assignmentId: string,
    input: {
        type: string;
        amount: string;
        currency: string;
        status: 'PLANNED' | 'PENDING';
        reference?: string;
    }
) => postData<PayoutRecord>(`${ledger}/${assignmentId}/payments`, input);

// Recording a payment never moves money; confirming one states that it reached the choreographer.
export const movePayout = async (paymentId: string, status: PayoutStatus) =>
    postData<PayoutRecord>(`${ledger}/payments/${paymentId}/status`, { status });
