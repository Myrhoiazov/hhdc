import { StateSchema } from "@/app/providers/StoreProvider";

export const getMollieClientForm = (state: StateSchema) => state.mollieClientForm?.form;
export const getMollieClientData= (state: StateSchema) => state.mollieClientForm?.data;
export const getMollieClienIsLoading= (state: StateSchema) => state.mollieClientForm?.isLoading ?? false;