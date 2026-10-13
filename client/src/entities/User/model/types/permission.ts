// The permissions the interface asks about. The server holds the full list and enforces every one
// of them; a name is added here when a screen starts to depend on it.
export type Permission =
    | 'ai.use'
    | 'audit.read'
    | 'automation.read'
    | 'campaigns.read'
    | 'choreographers.activity.read'
    | 'choreographers.contacts.manage'
    | 'choreographers.contacts.read'
    | 'choreographers.conversations.link'
    | 'choreographers.conversations.read'
    | 'choreographers.create'
    | 'choreographers.events.manage'
    | 'choreographers.finance.read'
    | 'choreographers.finance.write'
    | 'choreographers.media.manage'
    | 'choreographers.notes.manage'
    | 'choreographers.notes.read'
    | 'choreographers.payments.confirm'
    | 'choreographers.read'
    | 'choreographers.update'
    | 'communications.reply'
    | 'documents.read'
    | 'documents.write'
    | 'events.write'
    | 'finance.read'
    | 'operations.read'
    | 'people.write'
    | 'providers.read'
    | 'settings.manage'
    | 'tasks.read'
    | 'tasks.write'
    | 'users.manage';

// Answers whether the signed-in user holds a permission.
export type Can = (permission: Permission) => boolean;
