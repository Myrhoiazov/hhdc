import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { clientDetailsCommentsReducer } from '../../model/slices/clientDetailsCommentsSlice';
import { addCommentsForClient } from '../../model/services/addCommentsForClient/addCommentsForClient';
import { ClientDetailsComments } from './ClientDetailsComments';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('../../model/services/addCommentsForClient/addCommentsForClient', () => ({
    addCommentsForClient: jest.fn((text: string) => ({ type: 'clientDetails/addCommentForClient/mocked', payload: text })),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

function renderComments(id = '1') {
    const store = createReduxStore(undefined, { clientDetailsComments: clientDetailsCommentsReducer } as never);
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ClientDetailsComments id={id} />
            </MemoryRouter>
        </Provider>,
    );
}

describe('ClientDetailsComments', () => {
    test('fetches and renders the client comments', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: [{ id: 'c1', text: 'Nice!', author: { id: '2', firstName: 'Ivan' } }],
        });

        renderComments();

        expect(await screen.findByText('Nice!')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/comments', {
            params: { entityId: '1', entityType: 'client', _expand: 'user' },
        });
    });

    test('sends the typed text through addCommentsForClient when submitting', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });

        renderComments();

        const input = await screen.findByPlaceholderText('Введите текст');
        fireEvent.change(input, { target: { value: 'Great!' } });
        fireEvent.click(screen.getByRole('button'));

        expect(addCommentsForClient).toHaveBeenCalledWith('Great!');
    });
});
