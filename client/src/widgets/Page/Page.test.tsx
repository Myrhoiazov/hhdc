import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { uiActions } from '@/features/UI';
import { Page } from './Page';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderPage(props: Partial<React.ComponentProps<typeof Page>> = {}, route = '/clients') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        store,
        ...render(
            <Provider store={store}>
                <MemoryRouter initialEntries={[route]}>
                    <Page {...props}>content</Page>
                </MemoryRouter>
            </Provider>,
        ),
    };
}

describe('Page', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('renders its children', () => {
        renderPage();
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    test('renders a scroll trigger when onScrollEnd is provided', () => {
        const { container } = renderPage({ onScrollEnd: () => {} });
        expect(container.querySelector('.trigger')).toBeInTheDocument();
    });

    test('does not render a scroll trigger without onScrollEnd', () => {
        const { container } = renderPage();
        expect(container.querySelector('.trigger')).not.toBeInTheDocument();
    });

    test('persists the scroll position for the current path on scroll (throttled)', () => {
        const { store, container } = renderPage();
        const section = container.querySelector('section') as HTMLElement;

        Object.defineProperty(section, 'scrollTop', { value: 250, writable: true });
        fireEvent.scroll(section);

        act(() => {
            jest.advanceTimersByTime(500);
        });

        expect(store.getState().ui.scroll['/clients']).toBe(250);
    });

    test('restores the saved scroll position on mount', () => {
        const store = createReduxStore() as ReduxStoreWithManager;
        act(() => {
            store.dispatch(uiActions.setScrollPosition({ path: '/clients', position: 120 }));
        });

        const { container } = render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/clients']}>
                    <Page>content</Page>
                </MemoryRouter>
            </Provider>,
        );

        act(() => {
            jest.advanceTimersByTime(50);
        });

        const section = container.querySelector('section') as HTMLElement;
        expect(section.scrollTop).toBe(120);
    });
});
