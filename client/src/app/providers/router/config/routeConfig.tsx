import { LoginPage } from '@/pages/AuthPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { CommunicationsPage } from '@/pages/CrmPage';
import { PeoplePage, PersonPage } from '@/pages/PeoplePage';
import { EventPage, EventsPage } from '@/pages/EventsPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { ChoreographerPage, ChoreographersPage } from '@/pages/ChoreographersPage';
import { AssistantPage } from '@/pages/AssistantPage';
import { AutomationsPage } from '@/pages/AutomationsPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { DuplicatesPage } from '@/pages/DuplicatesPage';
import { OperationsPage } from '@/pages/OperationsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FinancePage } from '@/pages/FinancePage';
import { AuditPage } from '@/pages/AuditPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PlatformPage } from '@/pages/PlatformPage';
import { ProvidersPage } from '@/pages/ProvidersPage';
import { UsersPage } from '@/pages/UsersPage';
import { AppRoutes, AppRoutesProps, RoutePath } from '@/shared/config/routeConfig/routeConfig';

const protectedRoute = (path: string, element: React.ReactNode): AppRoutesProps => ({ path, element, authOnly: true });
export const routeConfig: Record<AppRoutes, AppRoutesProps> = {
    login: { path: RoutePath.login, element: <LoginPage /> },
    main: protectedRoute(RoutePath.main, <DashboardPage />),
    people: protectedRoute(RoutePath.people, <PeoplePage />),
    person: protectedRoute(RoutePath.person, <PersonPage />),
    choreographers: protectedRoute(RoutePath.choreographers, <ChoreographersPage />),
    choreographer: protectedRoute(RoutePath.choreographer, <ChoreographerPage />),
    choreographer_tab: protectedRoute(RoutePath.choreographer_tab, <ChoreographerPage />),
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
    notification_settings: protectedRoute(RoutePath.notification_settings, <NotificationsPage />),
    settings: protectedRoute(RoutePath.settings, <UsersPage />),
    providers: protectedRoute(RoutePath.providers, <ProvidersPage />),
    audit: protectedRoute(RoutePath.audit, <AuditPage />),
    not_found: protectedRoute(RoutePath.not_found, <NotFoundPage />),
};
