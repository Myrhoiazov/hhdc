import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { listNotificationSettings, NotificationSetting, setNotificationEnabled } from '@/entities/crm';
import { NotificationsPage } from './NotificationsPage';

jest.mock('@/entities/crm', () => ({
    listNotificationSettings: jest.fn(), setNotificationEnabled: jest.fn(), NOTIFICATION_GROUPS: ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'],
}));
jest.mock('@/widgets/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const setting = (overrides: Partial<NotificationSetting> = {}): NotificationSetting => ({
    key: 'NEW_TICKET_SALES', group: 'SALES', title: 'New ticket sales', enabled: true, configured: true, updatedAt: null, updatedBy: null, ...overrides,
});
const email = setting({ key: 'NEW_EMAIL', group: 'EMAIL', title: 'New email', enabled: false, updatedAt: '2026-10-08T10:00:00Z', updatedBy: { id: 'u1', name: 'Olga', email: 'olga@example.test' } });

beforeEach(() => {
    jest.mocked(listNotificationSettings).mockReset().mockResolvedValue([setting(), email]);
    jest.mocked(setNotificationEnabled).mockReset().mockResolvedValue(setting({ enabled: false }));
});

test('notifications are grouped, each with a switch that says whether it is on', async () => {
    render(<NotificationsPage />);

    const sales = await screen.findByRole('region', { name: 'Notification group: SALES' });
    expect(within(sales).getByRole('switch', { name: 'Notification: NEW_TICKET_SALES' })).toHaveAttribute('aria-checked', 'true');
    const mail = screen.getByRole('region', { name: 'Notification group: EMAIL' });
    expect(within(mail).getByRole('switch', { name: 'Notification: NEW_EMAIL' })).toHaveAttribute('aria-checked', 'false');
    expect(within(mail).getByText(/Changed by/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Notification group: PEOPLE_AND_FINANCE' })).not.toBeInTheDocument();
});

test('pressing a switch saves the opposite value and reloads the list', async () => {
    render(<NotificationsPage />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Notification: NEW_TICKET_SALES' }));
    await waitFor(() => expect(setNotificationEnabled).toHaveBeenCalledWith('NEW_TICKET_SALES', false));
    await waitFor(() => expect(listNotificationSettings).toHaveBeenCalledTimes(2));
});

test('a refusal to save is shown under its notification', async () => {
    jest.mocked(setNotificationEnabled).mockRejectedValue(new Error('Forbidden'));
    render(<NotificationsPage />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Notification: NEW_EMAIL' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Forbidden');
    expect(alert.closest('li')).toHaveTextContent('Notification: NEW_EMAIL');
});

test('a server without Telegram says that nothing is sent', async () => {
    jest.mocked(listNotificationSettings).mockResolvedValue([setting({ configured: false })]);
    render(<NotificationsPage />);

    expect(await screen.findByText(/Telegram is not set up on the server/)).toBeInTheDocument();
});
