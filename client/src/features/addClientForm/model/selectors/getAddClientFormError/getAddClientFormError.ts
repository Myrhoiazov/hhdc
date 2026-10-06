import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddClientFormError = (state: StateSchema) => state.client?.error;