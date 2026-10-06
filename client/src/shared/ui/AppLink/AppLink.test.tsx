import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AppLink, AppLinkTheme } from './AppLink';

describe('AppLink', () => {
    test('renders a link with its children and href', () => {
        render(
            <MemoryRouter>
                <AppLink to="/clients">Clients</AppLink>
            </MemoryRouter>,
        );

        const link = screen.getByText('Clients');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/clients');
    });

    test('defaults to the primary theme class', () => {
        render(
            <MemoryRouter>
                <AppLink to="/clients">Clients</AppLink>
            </MemoryRouter>,
        );

        expect(screen.getByText('Clients')).toHaveClass('primary');
    });

    test('applies the given theme class', () => {
        render(
            <MemoryRouter>
                <AppLink to="/clients" theme={AppLinkTheme.RED}>Clients</AppLink>
            </MemoryRouter>,
        );

        expect(screen.getByText('Clients')).toHaveClass('red');
    });
});
