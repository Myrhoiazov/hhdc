export type AppRoutesProps = {
    path?: string;
    element: React.ReactNode;
    authOnly?: boolean;
    index?: boolean;
    children?: AppRoutesProps[];
};
export enum AppRoutes {
    LOGIN = 'login', MAIN = 'main', PEOPLE = 'people', PERSON = 'person',
    EVENTS = 'events', EVENT = 'event', EMAIL = 'email', KNOWLEDGE_BASE = 'knowledge_base',
    DUPLICATES = 'duplicates', CAMPAIGNS = 'campaigns', AUTOMATIONS = 'automations', FINANCE = 'finance',
    ASSISTANT = 'assistant', OPERATIONS = 'operations', PLATFORM = 'platform',
    SETTINGS = 'settings', PROVIDERS = 'providers', AUDIT = 'audit', NOT_FOUND = 'not_found',
}
export const RoutePath: Record<AppRoutes, string> = {
    login: '/login', main: '/', people: '/people', person: '/people/:id',
    events: '/events', event: '/events/:id', email: '/email', knowledge_base: '/knowledge-base',
    duplicates: '/people/duplicates', campaigns: '/campaigns', automations: '/automations', finance: '/finance',
    assistant: '/assistant', operations: '/operations', platform: '/settings/platform',
    settings: '/settings', providers: '/settings/providers', audit: '/settings/audit', not_found: '*',
};
