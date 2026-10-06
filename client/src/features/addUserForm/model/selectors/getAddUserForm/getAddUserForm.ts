import { StateSchema } from "@/app/providers/StoreProvider";

export const getAddUserForm = (state: StateSchema) => state.newUser?.data;