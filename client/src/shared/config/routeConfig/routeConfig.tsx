export type AppRoutesProps = {
    path?: string;
    element: React.ReactNode;
    authOnly?: boolean;
    index?: boolean;
    children?: AppRoutesProps[];
};

export enum AppRoutes {
    LOGIN = 'login',
    MAIN = 'main',
    ABOUT = 'about',
    PROFILE = 'profile',
    TRANSACTIONS = 'transactions',
    ARTICLES = 'articles',
    ARTICLE_DETAILS = 'article_details',
    CLIENTS = 'clients',
    CLIENTS_DETAILS = 'client_details',
    MOLLIE = 'mollie',
    SETTINGS = 'settings',
    CHOREOGRAPHERS = 'choreographers',
    SCHEDULE = 'schedule',
    DANCE_SCHOOL = 'dance_school',
    SCHEDULE_SETTINGS = 'schedule_settings',
    DANCE_GROUPS = 'dance_groups',
    DANCE_STYLES = 'dance_styles',
    STUDENTS = 'students',
    COMPANY = 'company',
    BRANCHES = 'branches',
    CONTENT_HUB = 'content_hub',
    CRM_SETTINGS = 'crm_settings',
    INVOICES = 'invoices',
    ORGANIZATION_BRANDS = 'organization_brands',
    EMAIL = 'email',
    PAYMENT_REMINDERS = 'payment_reminders',
    KNOWLEDGE_BASE = 'knowledge_base',
    NOTIFICATIONS = 'notifications',
    // last
    NOT_FOUND = 'not_found',
}

export const RoutePath: Record<AppRoutes, string> = {
    [AppRoutes.MAIN]: '/',
    [AppRoutes.LOGIN]: '/login',
    [AppRoutes.MOLLIE]: '/mollie',
    [AppRoutes.ABOUT]: '/about',
    [AppRoutes.PROFILE]: '/profile/',
    [AppRoutes.ARTICLES]: '/articles',
    [AppRoutes.TRANSACTIONS]: '/transactions',
    [AppRoutes.CLIENTS]: '/clients',
    [AppRoutes.CLIENTS_DETAILS]: '/clients/',
    [AppRoutes.ARTICLE_DETAILS]: '/articles/',
    [AppRoutes.SETTINGS]: '/settings',
    [AppRoutes.CHOREOGRAPHERS]: '/choreographers',
    [AppRoutes.SCHEDULE]: '/schedule/calendar',
    [AppRoutes.DANCE_SCHOOL]: '/schedule/dance-school',
    [AppRoutes.SCHEDULE_SETTINGS]: '/schedule/settings',
    [AppRoutes.DANCE_GROUPS]: '/schedule/groups',
    [AppRoutes.DANCE_STYLES]: '/schedule/styles',
    [AppRoutes.STUDENTS]: '/students',
    [AppRoutes.COMPANY]: '/company',
    [AppRoutes.BRANCHES]: '/company/branches',
    [AppRoutes.CONTENT_HUB]: '/content-hub',
    [AppRoutes.CRM_SETTINGS]: '/crm-settings',
    [AppRoutes.INVOICES]: '/invoices',
    [AppRoutes.ORGANIZATION_BRANDS]: '/company/organization-brands',
    [AppRoutes.EMAIL]: '/email',
    [AppRoutes.PAYMENT_REMINDERS]: '/payment-reminders',
    [AppRoutes.KNOWLEDGE_BASE]: '/knowledge-base',
    [AppRoutes.NOTIFICATIONS]: '/notifications',
    [AppRoutes.NOT_FOUND]: '*',
};
