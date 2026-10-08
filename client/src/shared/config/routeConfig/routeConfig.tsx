export type AppRoutesProps = {
    path?: string;
    element: React.ReactNode;
    authOnly?: boolean;
    index?: boolean;
    children?: AppRoutesProps[];
};
export enum AppRoutes {
    LOGIN = 'login', MAIN = 'main', PEOPLE = 'people', PERSON = 'person',
    CHOREOGRAPHERS = 'choreographers', CHOREOGRAPHER = 'choreographer', CHOREOGRAPHER_TAB = 'choreographer_tab',
    EVENTS = 'events', EVENT = 'event', EMAIL = 'email', KNOWLEDGE_BASE = 'knowledge_base',
    DUPLICATES = 'duplicates', CAMPAIGNS = 'campaigns', AUTOMATIONS = 'automations', FINANCE = 'finance',
    ASSISTANT = 'assistant', OPERATIONS = 'operations', PLATFORM = 'platform', NOTIFICATION_SETTINGS = 'notification_settings',
    SETTINGS = 'settings', PROVIDERS = 'providers', AUDIT = 'audit', NOT_FOUND = 'not_found',
}
export const RoutePath: Record<AppRoutes, string> = {
    login: '/login', main: '/', people: '/people', person: '/people/:id',
    choreographers: '/people/choreographers', choreographer: '/people/choreographers/:id', choreographer_tab: '/people/choreographers/:id/:tab',
    events: '/events', event: '/events/:id', email: '/email', knowledge_base: '/knowledge-base',
    duplicates: '/people/duplicates', campaigns: '/campaigns', automations: '/automations', finance: '/finance',
    assistant: '/assistant', operations: '/operations', platform: '/settings/platform', notification_settings: '/settings/notifications',
    settings: '/settings', providers: '/settings/providers', audit: '/settings/audit', not_found: '*',
};
