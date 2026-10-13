import { $apiPrivate } from '@/shared/api/api';
import { patchData, postData, readData } from '@/shared/api/request';
import { ExpenseLine, ExpenseList, EventExpenseInput } from '../model/types';

export const listEventExpenses = async (eventId: string) =>
    readData<ExpenseList>(`/events/${eventId}/expenses`);

export const listPersonExpenses = async (personId: string) =>
    readData<ExpenseList>(`/people/${personId}/expenses`);

export const createEventExpense = async (eventId: string, input: EventExpenseInput) =>
    postData<ExpenseLine>(`/events/${eventId}/expenses`, input);

export const deleteEventExpense = async (eventId: string, expenseId: string) => {
    await $apiPrivate.delete(`/events/${eventId}/expenses/${expenseId}`);
};

export const updateEventExpense = async (
    eventId: string,
    expenseId: string,
    change: Partial<EventExpenseInput>
) => patchData<ExpenseLine>(`/events/${eventId}/expenses/${expenseId}`, change);
