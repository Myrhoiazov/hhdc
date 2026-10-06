import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddClientFormValidateErrors = (state: StateSchema) => state.client?.validateErrors;