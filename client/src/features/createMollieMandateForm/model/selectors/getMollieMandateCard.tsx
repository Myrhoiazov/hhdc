import { StateSchema } from '@/app/providers/StoreProvider';

export const getMollieMandateData = (state: StateSchema) => state?.createMollieMandateForm?.data;
export const getMollieMandateCustomers = (state: StateSchema) =>
    state?.createMollieMandateForm?.customers;
export const getMollieMandateError = (state: StateSchema) =>
    state?.createMollieMandateForm?.error ?? '';
export const getMollieMandateLoading = (state: StateSchema) =>
    state?.createMollieMandateForm?.isLoading ?? false;
