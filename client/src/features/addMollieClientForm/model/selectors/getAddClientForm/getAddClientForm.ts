import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddClientForm = (state: StateSchema) => state.addMollieClientForm?.data;
export const getAddClientFormError = (state: StateSchema) => state.addMollieClientForm?.error;
export const getAddClientFormIsLoading = (state: StateSchema) => state.addMollieClientForm?.isLoading;