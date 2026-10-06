import { LoginPage } from '@/pages/AuthPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { DashboardPage, PeoplePage, PersonPage, EventsPage, EventPage, AuditPage, ProvidersPage, UsersPage, CommunicationsPage, KnowledgePage, AutomationsPage, FinancePage, AssistantPage, OperationsPage, DuplicatesPage, CampaignsPage, PlatformPage } from '@/pages/CrmPage';
import { AppRoutes, AppRoutesProps, RoutePath } from '@/shared/config/routeConfig/routeConfig';

const protectedRoute = (path: string, element: React.ReactNode): AppRoutesProps => ({ path, element, authOnly: true });
export const routeConfig: Record<AppRoutes, AppRoutesProps> = {
    login: { path: RoutePath.login, element: <LoginPage /> },
    main: protectedRoute(RoutePath.main, <DashboardPage />),
    people: protectedRoute(RoutePath.people, <PeoplePage />),
    person: protectedRoute(RoutePath.person, <PersonPage />),
    events: protectedRoute(RoutePath.events, <EventsPage />),
    event: protectedRoute(RoutePath.event, <EventPage />),
    email: protectedRoute(RoutePath.email, <CommunicationsPage />),
    knowledge_base: protectedRoute(RoutePath.knowledge_base, <KnowledgePage />),
    duplicates: protectedRoute(RoutePath.duplicates, <DuplicatesPage />),
    campaigns: protectedRoute(RoutePath.campaigns, <CampaignsPage />),
    automations: protectedRoute(RoutePath.automations, <AutomationsPage />),
    finance: protectedRoute(RoutePath.finance, <FinancePage />),
    assistant: protectedRoute(RoutePath.assistant, <AssistantPage />),
    operations: protectedRoute(RoutePath.operations, <OperationsPage />),
    platform: protectedRoute(RoutePath.platform, <PlatformPage />),
    settings: protectedRoute(RoutePath.settings, <UsersPage />),
    providers: protectedRoute(RoutePath.providers, <ProvidersPage />),
    audit: protectedRoute(RoutePath.audit, <AuditPage />),
    not_found: protectedRoute(RoutePath.not_found, <NotFoundPage />),
};
