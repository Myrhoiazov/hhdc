export type { CreateEmailAccountPayload, EmailAccount, EmailSyncResult } from './model/types/emailAccount';
export {
    createEmailAccount,
    deleteEmailAccount,
    fetchEmailAccounts,
    syncEmailAccount,
} from './model/services/emailAccountApi';
