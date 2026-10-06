import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import AddCommentForm from './AddCommentForm';

function renderForm(onSendComment = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onSendComment,
        ...render(
            <Provider store={store}>
                <AddCommentForm onSendComment={onSendComment} />
            </Provider>,
        ),
    };
}

describe('AddCommentForm', () => {
    // This component calls `t()` imported directly from `i18next` rather than via
    // `useTranslation()`, so it bypasses the `react-i18next` test mock and renders
    // with an empty label here (real i18next isn't initialized in tests) — query
    // the button by role only, not by its (untranslated) accessible name.
    test('renders the input and send button', () => {
        renderForm();
        expect(screen.getByPlaceholderText('Введите текст')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('updates the input value as the user types', () => {
        renderForm();
        const input = screen.getByPlaceholderText('Введите текст');

        fireEvent.change(input, { target: { value: 'Hello' } });

        expect(input).toHaveValue('Hello');
    });

    test('calls onSendComment with the current text and clears the input', () => {
        const { onSendComment } = renderForm();
        const input = screen.getByPlaceholderText('Введите текст');

        fireEvent.change(input, { target: { value: 'Hello' } });
        fireEvent.click(screen.getByRole('button'));

        expect(onSendComment).toHaveBeenCalledWith('Hello');
        expect(input).toHaveValue('');
    });
});
