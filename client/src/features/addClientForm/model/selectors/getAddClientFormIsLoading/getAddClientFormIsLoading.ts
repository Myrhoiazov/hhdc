import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddClientFormIsLoading = (state: StateSchema) => state.client?.isLoading;