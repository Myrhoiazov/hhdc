import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getUserInited = (state: StateSchema) => state.user._inited;
