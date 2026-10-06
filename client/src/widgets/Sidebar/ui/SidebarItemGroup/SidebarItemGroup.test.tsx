import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { SidebarItemGroup } from './SidebarItemGroup';
import { SidebarItemType } from '../../model/types/sidebar';

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="icon" {...props} />;

const item: SidebarItemType = {
    path: '/mollie',
    text: 'Mollie',
    Icon: MockIcon,
    children: [
        { path: '/mollie/customers', text: 'Customers', Icon: MockIcon },
        { path: '/mollie/payments', text: 'Payments', Icon: MockIcon },
    ],
};

function renderGroup(props: Partial<React.ComponentProps<typeof SidebarItemGroup>> = {}, route = '/') {
    const store = configureStore({
        reducer: { user: userReducer },
        preloadedState: { user: { _inited: true, authData: undefined } },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[route]}>
                <SidebarItemGroup item={item} collapsed={false} isOpen={false} onToggle={() => {}} {...props} />
            </MemoryRouter>
        </Provider>,
    );
}

test('renders only the icon when collapsed', () => {
    renderGroup({ collapsed: true });
    expect(screen.queryByText('Mollie')).not.toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
});

test('renders the trigger label and children when expanded', () => {
    renderGroup({ collapsed: false });
    expect(screen.getByText('Mollie')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
});

test('hides the children wrapper via aria-hidden when not open', () => {
    const { container } = renderGroup({ isOpen: false });
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

test('shows the children wrapper when open', () => {
    const { container } = renderGroup({ isOpen: true });
    expect(container.querySelector('[aria-hidden="false"]')).toBeInTheDocument();
});

test('calls onToggle with the item text when the trigger is clicked', () => {
    const onToggle = jest.fn();
    renderGroup({ onToggle });

    fireEvent.click(screen.getByText('Mollie'));

    expect(onToggle).toHaveBeenCalledWith('Mollie');
});

test('marks the trigger active when a child route matches', () => {
    renderGroup({}, '/mollie/customers/5');
    expect(screen.getByText('Mollie').closest('button')).toHaveClass('active');
});

test('colours the expanded trigger icon through its own modifier class', () => {
    renderGroup();
    expect(screen.getAllByTestId('icon')[0]).toHaveClass('icon', 'iconFill');
});

test('colours a stroke trigger icon through its own modifier class', () => {
    renderGroup({ item: { ...item, iconColor: 'stroke' } });
    expect(screen.getAllByTestId('icon')[0]).toHaveClass('icon', 'iconStroke');
});

test('colours the collapsed trigger icon through its own modifier class', () => {
    renderGroup({ collapsed: true });
    expect(screen.getByTestId('icon')).toHaveClass('icon', 'iconFill');
});
