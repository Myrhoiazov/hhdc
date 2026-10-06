import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { SidebarItem } from './SidebarItem';
import { SidebarItemType } from '../../model/types/sidebar';

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon" {...props} />;

const item: SidebarItemType = {
    path: '/clients',
    text: 'Clients',
    Icon: MockIcon,
};

function renderItem(itemOverrides: Partial<SidebarItemType> = {}, options: { authed?: boolean; route?: string } = {}) {
    const { authed = true, route = '/' } = options;
    const store = configureStore({
        reducer: { user: userReducer },
        preloadedState: {
            user: {
                _inited: true,
                authData: authed ? { id: '1', name: 'denis', email: 'd@example.com', roles: ['ADMIN'], permissions: [] } : undefined,
            },
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>
                <SidebarItem item={{ ...item, ...itemOverrides }} collapsed={false} />
            </MemoryRouter>
        </Provider>,
    );
}

test('renders the link text and icon', () => {
    renderItem();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
});

test('links to the item path', () => {
    renderItem();
    expect(screen.getByText('Clients').closest('a')).toHaveAttribute('href', '/clients');
});

test('renders nothing when authOnly and there is no authenticated user', () => {
    const { container } = renderItem({ authOnly: true }, { authed: false });
    expect(container).toBeEmptyDOMElement();
});

test('renders when authOnly and the user is authenticated', () => {
    renderItem({ authOnly: true }, { authed: true });
    expect(screen.getByText('Clients')).toBeInTheDocument();
});

test('marks itself active when the current path matches', () => {
    renderItem({}, { route: '/clients' });
    expect(screen.getByText('Clients').closest('a')).toHaveClass('active');
});

test('marks itself active for a nested path', () => {
    renderItem({}, { route: '/clients/5' });
    expect(screen.getByText('Clients').closest('a')).toHaveClass('active');
});

test('does not mark itself active for an unrelated path', () => {
    renderItem({}, { route: '/transactions' });
    expect(screen.getByText('Clients').closest('a')).not.toHaveClass('active');
});

// The icon colour must come from the sidebar's own classes: the shared Icon's class names
// are hashed in the production build, so they cannot be targeted from here.
test('colours a fill icon through its own modifier class', () => {
    renderItem();
    expect(screen.getByTestId('icon')).toHaveClass('icon', 'iconFill');
    expect(screen.getByTestId('icon')).not.toHaveClass('iconStroke');
});

test('colours a stroke icon through its own modifier class', () => {
    renderItem({ iconColor: 'stroke' });
    expect(screen.getByTestId('icon')).toHaveClass('icon', 'iconStroke');
    expect(screen.getByTestId('icon')).not.toHaveClass('iconFill');
});
