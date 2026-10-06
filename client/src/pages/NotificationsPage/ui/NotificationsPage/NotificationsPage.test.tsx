import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager, StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { $apiPrivate } from '@/shared/api/api';
import NotificationsPage from './NotificationsPage';
import type { NotificationSetting } from './useNotificationSettings';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const getMock = $apiPrivate.get as jest.Mock;
const putMock = $apiPrivate.put as jest.Mock;

const setting = (overrides: Partial<NotificationSetting>): NotificationSetting => ({
    key: 'MOLLIE_PAYMENT',
    title: 'Платежи Mollie',
    group: 'STUDENTS_AND_MOLLIE',
    recipient: 'GROUP_CHAT',
    enabled: true,
    configured: true,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
});

const items: NotificationSetting[] = [
    setting({ key: 'NEW_STUDENT', title: 'Новый ученик', enabled: false }),
    setting({}),
    setting({
        key: 'LOGIN_BLOCKED',
        title: 'Блокировка входа по лимиту попыток',
        group: 'SECURITY',
        updatedAt: '2026-10-02T12:00:00.000Z',
        updatedBy: { id: 1, email: 'admin@example.test' },
    }),
    setting({ key: 'NEW_EMAIL', title: 'Новое письмо', group: 'EMAIL', recipient: 'EMAIL_PRIVATE_CHAT', configured: false }),
];

function renderPage(role: RoleKey = RoleKey.ADMIN) {
    const initialState = {
        user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role } },
    } as StateSchema;
    const store = createReduxStore(initialState) as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <NotificationsPage />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({ data: { items } });
});

test('shows the notifications grouped by purpose with their current state', async () => {
    renderPage();

    const studentsGroup = await screen.findByRole('region', { name: 'Ученики и Mollie' });
    expect(within(studentsGroup).getByRole('switch', { name: 'Новый ученик' })).toHaveAttribute('aria-checked', 'false');
    expect(within(studentsGroup).getByRole('switch', { name: 'Платежи Mollie' })).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByRole('region', { name: 'Безопасность' })).getByRole('switch')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Почта' })).getByRole('switch', { name: 'Новое письмо' })).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/telegram-notifications');
});

test('describes the student and Mollie record notifications', async () => {
    getMock.mockResolvedValue({
        data: {
            items: [
                setting({ key: 'STUDENT_DELETED', title: 'Удаление ученика', enabled: false }),
                setting({ key: 'MOLLIE_CUSTOMER_DELETED', title: 'Удаление клиента Mollie', enabled: false }),
                setting({ key: 'MOLLIE_MANDATE', title: 'Мандаты Mollie', enabled: false }),
                setting({ key: 'MOLLIE_SUBSCRIPTION', title: 'Подписки Mollie', enabled: false }),
            ],
        },
    });
    renderPage();

    const studentsGroup = await screen.findByRole('region', { name: 'Ученики и Mollie' });
    expect(within(studentsGroup).getAllByRole('switch')).toHaveLength(4);
    expect(within(studentsGroup).getByText(/ученика удалили из CRM/)).toBeInTheDocument();
    expect(within(studentsGroup).getByText(/клиента Mollie удалили из CRM/)).toBeInTheDocument();
    expect(within(studentsGroup).getByText(/Создание и отзыв мандатов Mollie/)).toBeInTheDocument();
    expect(within(studentsGroup).getByText(/перезапуск подписок Mollie/)).toBeInTheDocument();
});

test('shows who changed a setting last', async () => {
    renderPage();

    expect(await screen.findByText(/admin@example\.test/)).toBeInTheDocument();
});

test('warns when Telegram is not configured for a notification', async () => {
    renderPage();

    const emailGroup = await screen.findByRole('region', { name: 'Почта' });
    expect(within(emailGroup).getByText('Telegram для этого уведомления не настроен')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Безопасность' })).queryByText('Telegram для этого уведомления не настроен'))
        .not.toBeInTheDocument();
});

test('saves a switch immediately when it is clicked', async () => {
    putMock.mockResolvedValue({ data: setting({ key: 'NEW_STUDENT', title: 'Новый ученик', enabled: true }) });
    renderPage();

    fireEvent.click(await screen.findByRole('switch', { name: 'Новый ученик' }));

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Новый ученик' })).toHaveAttribute('aria-checked', 'true'));
    expect(putMock).toHaveBeenCalledWith('/telegram-notifications/NEW_STUDENT', { enabled: true });
});

test('keeps the previous state and shows an error when saving fails', async () => {
    putMock.mockRejectedValue(new Error('network error'));
    renderPage();

    fireEvent.click(await screen.findByRole('switch', { name: 'Платежи Mollie' }));

    expect(await screen.findByText('Не удалось сохранить настройку')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Платежи Mollie' })).toHaveAttribute('aria-checked', 'true');
});

test('shows an error when the settings cannot be loaded', async () => {
    getMock.mockRejectedValue(new Error('network error'));
    renderPage();

    expect(await screen.findByText('Не удалось загрузить настройки уведомлений')).toBeInTheDocument();
});

test('does not load the settings for a non-admin and explains why', async () => {
    renderPage(RoleKey.MANAGER);

    expect(await screen.findByText('Раздел доступен только администратору')).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});
