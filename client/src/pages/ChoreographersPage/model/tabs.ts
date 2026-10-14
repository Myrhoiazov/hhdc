// A tab is listed only for people who may read it; the server enforces the same permission.
export const TABS = [
    { id: 'overview', label: 'Overview', permission: 'choreographers.read' },
    { id: 'biography', label: 'Biography', permission: 'choreographers.read' },
    { id: 'events', label: 'Events & History', permission: 'choreographers.read' },
    { id: 'finance', label: 'Finance', permission: 'choreographers.finance.read' },
    { id: 'documents', label: 'Documents', permission: 'documents.read' },
    { id: 'emails', label: 'Emails', permission: 'choreographers.conversations.read' },
    { id: 'media', label: 'Photos', permission: 'choreographers.read' },
    { id: 'contacts', label: 'Contacts', permission: 'choreographers.contacts.read' },
    { id: 'notes', label: 'Notes and follow-ups', permission: 'choreographers.notes.read' },
    { id: 'activity', label: 'Activity', permission: 'choreographers.activity.read' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const CHECKLIST_LABELS: Record<string, string> = {
    stage_name: 'Stage name',
    biography: 'Biography',
    styles: 'Dance styles',
    country: 'Country',
    social_link: 'Instagram or website',
    email: 'Email',
};
