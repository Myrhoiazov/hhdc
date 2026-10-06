import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { Sidebar } from './Sidebar';

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }),
    });
});

const renderSidebar = () => {
    const store = configureStore({ reducer: { user: userReducer } });
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        </Provider>,
    );
};

describe('Sidebar', () => {
    test('test sidebar', () => {
        renderSidebar();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
    test('test sidebar with toggle', () => {
        renderSidebar();
        const toggleBtn = screen.getByTestId('sidebar-toggle');
        expect(toggleBtn).toBeInTheDocument();
        fireEvent.click(toggleBtn);
        expect(screen.getByTestId('sidebar')).toHaveClass('collapsed');
        fireEvent.click(toggleBtn);
        expect(screen.getByTestId('sidebar')).not.toHaveClass('collapsed');
    });
    test('renders the language switcher in the footer', () => {
        renderSidebar();
        const footer = screen.getByTestId('sidebar-footer');
        expect(within(footer).getByRole('group', { name: 'Выбор языка' })).toBeInTheDocument();
        expect(within(footer).getByRole('button', { name: 'UA' })).toBeInTheDocument();
    });
});
