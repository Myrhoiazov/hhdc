import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { EditSubscriptionDropdown } from './EditSubscriptionDropdown';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { delete: jest.fn(), patch: jest.fn(), post: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const mandates: Mandate[] = [{ id: 'mnd_1', status: 'valid', method: 'directdebit' as never }];

function renderDropdown(subscription: Partial<MollieSubscription>, reloadPage = jest.fn()) {
    return {
        reloadPage,
        ...render(
            <EditSubscriptionDropdown
                customerId="1"
                subscription={subscription as MollieSubscription}
                mandates={mandates}
                reloadPage={reloadPage}
            />,
        ),
    };
}

describe('EditSubscriptionDropdown', () => {
    test('shows a visible stop action for an active subscription', () => {
        renderDropdown({ status: 'active' });

        expect(screen.getByRole('button', { name: 'Остановить' })).toBeInTheDocument();
    });

    test('shows edit/stop actions for an active subscription', async () => {
        renderDropdown({ status: 'active' });
        fireEvent.click(screen.getByRole('button', { name: 'Действия подписки' }));

        expect(await screen.findByText('Изменить подписку')).toBeInTheDocument();
        expect(screen.queryByText('Остановить подписку')).not.toBeInTheDocument();
    });

    test('shows a restart action for a canceled subscription', async () => {
        renderDropdown({ status: 'canceled' });
        fireEvent.click(screen.getByRole('button'));

        expect(screen.queryByRole('button', { name: 'Остановить' })).not.toBeInTheDocument();
        expect(await screen.findByText('Запустить снова')).toBeInTheDocument();
    });

    test('shows no actions for a subscription in an unknown state', () => {
        renderDropdown({ status: 'pending' });
        fireEvent.click(screen.getByRole('button'));

        expect(screen.queryByText('Изменить подписку')).not.toBeInTheDocument();
        expect(screen.queryByText('Запустить снова')).not.toBeInTheDocument();
    });

    test('cancels the subscription and reloads the page', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        const { reloadPage } = renderDropdown({ id: 'sub_1', status: 'active' });

        fireEvent.click(await screen.findByRole('button', { name: 'Остановить' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Остановить' })[1]);

        await screen.findByRole('button', { name: 'Остановить' });
        expect($apiPrivate.delete).toHaveBeenCalledWith('/mollie/subscriptions/sub_1', {
            data: { customerId: 1 },
        });
        expect(reloadPage).toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith('Подписка отменена');
    });

    test('shows a server error detail when cancellation fails', async () => {
        const error = Object.assign(new Error('conflict'), {
            isAxiosError: true,
            response: { data: { detail: 'Only active subscriptions can be canceled' } },
        });
        ($apiPrivate.delete as jest.Mock).mockRejectedValue(error);
        renderDropdown({ id: 'sub_1', status: 'active' });

        fireEvent.click(await screen.findByRole('button', { name: 'Остановить' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Остановить' })[1]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only active subscriptions can be canceled'));
    });

    test('does not call the API when the subscription id is missing', async () => {
        renderDropdown({ status: 'active' });

        fireEvent.click(await screen.findByRole('button', { name: 'Остановить' }));
        fireEvent.click(screen.getAllByRole('button', { name: 'Остановить' })[1]);

        expect($apiPrivate.delete).not.toHaveBeenCalled();
    });

    test('shows a server error detail when updating fails', async () => {
        const error = Object.assign(new Error('bad request'), {
            isAxiosError: true,
            response: { data: { detail: 'Mandate expired' } },
        });
        ($apiPrivate.patch as jest.Mock).mockRejectedValue(error);
        renderDropdown({ id: 'sub_1', status: 'active', mandateId: 'mnd_1' });

        fireEvent.click(screen.getByRole('button', { name: 'Действия подписки' }));
        fireEvent.click(await screen.findByText('Изменить подписку'));
        fireEvent.click(await screen.findByRole('button', { name: 'Сохранить' }));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Mandate expired'));
    });
});
