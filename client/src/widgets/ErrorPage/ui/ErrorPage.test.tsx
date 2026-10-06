import { fireEvent, render, screen } from '@testing-library/react';
import ErrorPage from './ErrorPage';

describe('ErrorPage', () => {
    test('renders the error message and reload button', () => {
        render(<ErrorPage />);
        expect(screen.getByText('ErrorPage')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ReloadPage' })).toBeInTheDocument();
    });

    test('reloads the page when the button is clicked', () => {
        const reload = jest.fn();
        Object.defineProperty(window, 'location', {
            value: { reload },
            writable: true,
        });

        render(<ErrorPage />);
        fireEvent.click(screen.getByRole('button', { name: 'ReloadPage' }));

        expect(reload).toHaveBeenCalledTimes(1);
    });
});
