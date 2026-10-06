import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddClientForm = (state: StateSchema) => state.client?.form;