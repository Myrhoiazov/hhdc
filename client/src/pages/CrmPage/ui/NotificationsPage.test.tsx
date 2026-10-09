import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { listNotificationSettings, NotificationSetting, saveNotificationTemplate, sendTestNotification, setNotificationEnabled } from '@/entities/crm';
import { previewMessage } from './NotificationTemplate';
import { NotificationsPage } from './NotificationsPage';

jest.mock('@/entities/crm', () => ({
    listNotificationSettings: jest.fn(), setNotificationEnabled: jest.fn(), saveNotificationTemplate: jest.fn(), sendTestNotification: jest.fn(), NOTIFICATION_GROUPS: ['SALES', 'EMAIL', 'PEOPLE_AND_FINANCE'],
}));
jest.mock('@/widgets/Page', () => ({ Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const SALES_TEXT = '🎟 New ticket orders: {{orders}}\n{{link}}';
const salesField = () => within(screen.getByRole('region', { name: 'Notification group: SALES' })).getByRole('textbox');

const setting = (overrides: Partial<NotificationSetting> = {}): NotificationSetting => ({
    key: 'NEW_TICKET_SALES', group: 'SALES', title: 'New ticket sales', enabled: true, configured: true, updatedAt: null, updatedBy: null,
    template: SALES_TEXT, defaultTemplate: SALES_TEXT, customised: false, placeholders: [{ name: 'orders', example: '3' }, { name: 'link', example: 'https://crm.example.com/events' }], ...overrides,
});
const email = setting({ key: 'NEW_EMAIL', group: 'EMAIL', title: 'New email', enabled: false, updatedAt: '2026-10-08T10:00:00Z', updatedBy: { id: 'u1', name: 'Olga', email: 'olga@example.test' } });

beforeEach(() => {
    jest.mocked(listNotificationSettings).mockReset().mockResolvedValue([setting(), email]);
    jest.mocked(setNotificationEnabled).mockReset().mockResolvedValue(setting({ enabled: false }));
    jest.mocked(saveNotificationTemplate).mockReset().mockResolvedValue(setting());
    jest.mocked(sendTestNotification).mockReset().mockResolvedValue({ sent: true, text: '' });
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

test('a text is shown with its values filled by examples, and a line left empty is dropped', () => {
    const placeholders = [{ name: 'orders', example: '3' }, { name: 'link', example: '' }];
    expect(previewMessage('Заказы: {{orders}}\n\n{{link}}', placeholders)).toBe('Заказы: 3');
    expect(previewMessage('{{ orders }} / {{unknown}}', placeholders)).toBe('3 /');
    expect(previewMessage('Заказы: {{orders}}\nСсылка: {{link}}', placeholders)).toBe('Заказы: 3');
});

test('a text is written with placeholders, previewed and saved with its button', async () => {
    render(<NotificationsPage />);
    await screen.findByRole('switch', { name: 'Notification: NEW_TICKET_SALES' });
    const sales = screen.getByRole('region', { name: 'Notification group: SALES' });
    expect(within(sales).getByRole('button', { name: 'Save text' })).toBeDisabled();

    fireEvent.change(salesField(), { target: { value: 'Продано заказов: ' } });
    fireEvent.click(within(sales).getByRole('button', { name: '{{orders}}' }));
    expect(salesField()).toHaveValue('Продано заказов: {{orders}}');
    expect(within(sales).getByText('Продано заказов: 3')).toBeInTheDocument();

    fireEvent.click(within(sales).getByRole('button', { name: 'Save text' }));
    await waitFor(() => expect(saveNotificationTemplate).toHaveBeenCalledWith('NEW_TICKET_SALES', 'Продано заказов: {{orders}}'));
    expect(await within(sales).findByText('Text saved')).toBeInTheDocument();
    await waitFor(() => expect(listNotificationSettings).toHaveBeenCalledTimes(2));
});

test('a refused text shows the reason, and a changed text returns to the first one', async () => {
    jest.mocked(listNotificationSettings).mockResolvedValue([setting({ template: 'Свой текст', customised: true })]);
    jest.mocked(saveNotificationTemplate).mockRejectedValueOnce(new Error('This notification has no such values: {{buyer}}'));
    render(<NotificationsPage />);
    await screen.findByRole('switch', { name: 'Notification: NEW_TICKET_SALES' });

    fireEvent.change(salesField(), { target: { value: 'Купил {{buyer}}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save text' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('{{buyer}}');

    fireEvent.click(screen.getByRole('button', { name: 'Return the first text' }));
    await waitFor(() => expect(saveNotificationTemplate).toHaveBeenLastCalledWith('NEW_TICKET_SALES', null));
});

test('a test message is sent for the saved text only, and only when Telegram is set up', async () => {
    render(<NotificationsPage />);
    await screen.findByRole('switch', { name: 'Notification: NEW_TICKET_SALES' });
    const sales = screen.getByRole('region', { name: 'Notification group: SALES' });

    fireEvent.click(within(sales).getByRole('button', { name: 'Send a test message' }));
    await waitFor(() => expect(sendTestNotification).toHaveBeenCalledWith('NEW_TICKET_SALES'));
    expect(await within(sales).findByText('Test message sent')).toBeInTheDocument();

    fireEvent.change(salesField(), { target: { value: 'Черновик' } });
    expect(within(sales).getByRole('button', { name: 'Send a test message' })).toBeDisabled();
});
