import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ArticlesPage } from '@/pages/ArticlesPage';
import { ArticleDetailsPage } from '@/pages/ArticleDetailsPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { LoginPage } from '@/pages/AuthPage';
import { ClientsDetailsPage } from '@/pages/ClientsDetailsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { MollieCustomerDetails, MollieCustomers, MollieIncidents, MollieMain, MolliePage, MolliePayments, MolliePaymentsMatrix } from '@/pages/MolliePage';
import { ChoreographersPage } from '@/pages/ChoreographersPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { DanceSchoolPage } from '@/pages/DanceSchoolPage';
import { ScheduleSettingsPage } from '@/pages/ScheduleSettingsPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { CompanyPage } from '@/pages/CompanyPage';
import { BranchesPage } from '@/pages/BranchesPage';
import { ContentHubPage } from '@/pages/ContentHubPage';
import { CrmSettingsPage } from '@/pages/CrmSettingsPage';
import { DanceStylesPage } from '@/pages/DanceStylesPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { OrganizationBrandsPage } from '@/pages/OrganizationBrandsPage';
import { EmailPage } from '@/pages/EmailPage';
import { PaymentRemindersPage } from '@/pages/PaymentRemindersPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { AppRoutes, AppRoutesProps, RoutePath } from '@/shared/config/routeConfig/routeConfig';

export const routeConfig: Record<AppRoutes, AppRoutesProps> = {
    [AppRoutes.LOGIN]: {
        path: RoutePath.login,
        element: <LoginPage />,
    },
    [AppRoutes.MAIN]: {
        path: RoutePath.main,
        element: <HomePage />,
        authOnly: true,
    },
    [AppRoutes.ABOUT]: {
        path: RoutePath.about,
        element: <AboutPage />,
        authOnly: true,
    },
    [AppRoutes.PROFILE]: {
        path: `${RoutePath.profile}:id`,
        element: <ProfilePage />,
        authOnly: true,
    },
    [AppRoutes.ARTICLES]: {
        path: RoutePath.articles,
        element: <ArticlesPage />,
        authOnly: true,
    },
    [AppRoutes.TRANSACTIONS]: {
        path: RoutePath.transactions,
        element: <TransactionsPage />,
        authOnly: true,
    },
    [AppRoutes.ARTICLE_DETAILS]: {
        path: `${RoutePath.article_details}:id`,
        element: <ArticleDetailsPage />,
        authOnly: true,
    },
    [AppRoutes.CLIENTS]: {
        path: RoutePath.clients,
        element: <ClientsPage />,
        authOnly: true,
    },
    [AppRoutes.CLIENTS_DETAILS]: {
        path: `${RoutePath.client_details}:id`,
        element: <ClientsDetailsPage />,
        authOnly: true,
    },
    [AppRoutes.SETTINGS]: {
        path: RoutePath.settings,
        element: <SettingsPage />,
        authOnly: true,
    },
    [AppRoutes.MOLLIE]: {
        path: RoutePath.mollie,
        element: <MolliePage />,
        authOnly: true,
        children: [
            { index: true, element: <MollieMain />, authOnly: true },
            { path: 'customers', element: <MollieCustomers />, authOnly: true },
            { path: 'payments', element: <MolliePayments />, authOnly: true },
            { path: 'payments-matrix', element: <MolliePaymentsMatrix />, authOnly: true },
            { path: 'incidents', element: <MollieIncidents />, authOnly: true },
            { path: 'customers/:id', element: <MollieCustomerDetails />, authOnly: true },
        ],
    },
    [AppRoutes.CHOREOGRAPHERS]: {
        path: RoutePath.choreographers,
        element: <ChoreographersPage />,
        authOnly: true,
    },
    [AppRoutes.SCHEDULE]: {
        path: RoutePath.schedule,
        element: <SchedulePage />,
        authOnly: true,
    },
    [AppRoutes.DANCE_SCHOOL]: {
        path: RoutePath.dance_school,
        element: <DanceSchoolPage />,
        authOnly: true,
    },
    [AppRoutes.SCHEDULE_SETTINGS]: {
        path: RoutePath.schedule_settings,
        element: <ScheduleSettingsPage />,
        authOnly: true,
    },
    [AppRoutes.DANCE_GROUPS]: {
        path: RoutePath.dance_groups,
        element: <ScheduleSettingsPage />,
        authOnly: true,
    },
    [AppRoutes.DANCE_STYLES]: {
        path: RoutePath.dance_styles,
        element: <DanceStylesPage />,
        authOnly: true,
    },
    [AppRoutes.STUDENTS]: {
        path: RoutePath.students,
        element: <StudentsPage />,
        authOnly: true,
    },
    [AppRoutes.COMPANY]: {
        path: RoutePath.company,
        element: <CompanyPage />,
        authOnly: true,
        children: [
            { index: true, element: <MollieMain />, authOnly: true },
            { path: 'customers', element: <MollieCustomers />, authOnly: true },
            { path: 'payments', element: <MolliePayments />, authOnly: true },
            { path: 'payments-matrix', element: <MolliePaymentsMatrix />, authOnly: true },
            { path: 'incidents', element: <MollieIncidents />, authOnly: true },
            { path: 'customers/:id', element: <MollieCustomerDetails />, authOnly: true },
        ],
    },
    [AppRoutes.BRANCHES]: {
        path: RoutePath.branches,
        element: <BranchesPage />,
        authOnly: true,
    },
    [AppRoutes.CONTENT_HUB]: {
        path: RoutePath.content_hub,
        element: <ContentHubPage />,
        authOnly: true,
    },
    [AppRoutes.CRM_SETTINGS]: {
        path: RoutePath.crm_settings,
        element: <CrmSettingsPage />,
        authOnly: true,
    },
    [AppRoutes.INVOICES]: {
        path: RoutePath.invoices,
        element: <InvoicesPage />,
        authOnly: true,
    },
    [AppRoutes.ORGANIZATION_BRANDS]: {
        path: RoutePath.organization_brands,
        element: <OrganizationBrandsPage />,
        authOnly: true,
    },
    [AppRoutes.EMAIL]: {
        path: RoutePath.email,
        element: <EmailPage />,
        authOnly: true,
    },
    [AppRoutes.PAYMENT_REMINDERS]: {
        path: RoutePath.payment_reminders,
        element: <PaymentRemindersPage />,
        authOnly: true,
    },
    [AppRoutes.KNOWLEDGE_BASE]: {
        path: RoutePath.knowledge_base,
        element: <KnowledgeBasePage />,
        authOnly: true,
    },
    [AppRoutes.NOTIFICATIONS]: {
        path: RoutePath.notifications,
        element: <NotificationsPage />,
        authOnly: true,
    },
    [AppRoutes.NOT_FOUND]: {
        path: RoutePath.not_found,
        element: <NotFoundPage />,
        authOnly: true,
    },
};
