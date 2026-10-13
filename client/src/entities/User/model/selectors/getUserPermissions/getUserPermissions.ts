import { StateSchema } from '@/shared/lib/store/StateSchema';

// One list for everybody who is not signed in, so that selecting it never causes a render.
const NO_PERMISSIONS: string[] = [];

export const getUserPermissions = (state: StateSchema) => state.user.authData?.permissions ?? NO_PERMISSIONS;
