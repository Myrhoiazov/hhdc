import { StateSchema } from '@/app/providers/StoreProvider';

export const getMollieSubscriptionData = (state: StateSchema) => state?.addMollieSubscriptionForm?.data;
export const getMollieSubscriptionCustomers = (state: StateSchema) =>
    state?.addMollieSubscriptionForm?.customers;
export const getMollieSubscriptionError = (state: StateSchema) =>
    state?.addMollieSubscriptionForm?.error ?? '';
export const getMollieSubscriptionLoading = (state: StateSchema) =>
    state?.addMollieSubscriptionForm?.isLoading ?? false;