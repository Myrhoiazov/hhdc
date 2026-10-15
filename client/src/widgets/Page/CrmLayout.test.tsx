import { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CrmLayout } from './CrmLayout';

jest.mock('./Page', () => ({
    Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const renderLayout = (back?: { to: string; label: string }) =>
    render(
        <MemoryRouter>
            <CrmLayout title="Events" back={back}>
                <p>Body</p>
            </CrmLayout>
        </MemoryRouter>
    );

test('shows the title and the blocks of the page', () => {
    renderLayout();

    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('a page entered from a list has the way back above the title', () => {
    renderLayout({ to: '/events', label: 'Back to events' });

    expect(screen.getByRole('link', { name: '← Back to events' })).toHaveAttribute(
        'href',
        '/events'
    );
});
