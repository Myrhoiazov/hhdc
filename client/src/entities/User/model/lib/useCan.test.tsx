import { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { StoreProvider } from '@/app/providers/StoreProvider';
import { useCan } from './useCan';

jest.mock('@/shared/api/api', () => ({ $api: {}, $apiPrivate: {}, setUnauthorizedHandler: jest.fn(), csrfActions: { set: jest.fn(), reset: jest.fn() } }));

const signedInWith = (permissions: string[]) => ({ children }: { children: ReactNode }) => (
    <StoreProvider initialState={{ user: { _inited: true, authData: { id: '1', name: 'denis', email: 'denis@example.com', roles: [], permissions } } }}>
        {children}
    </StoreProvider>
);

test('answers for the user who is signed in', () => {
    const { result } = renderHook(() => useCan(), { wrapper: signedInWith(['people.write']) });

    expect(result.current('people.write')).toBe(true);
    expect(result.current('finance.read')).toBe(false);
});

test('keeps the same function between renders', () => {
    const { result, rerender } = renderHook(() => useCan(), { wrapper: signedInWith(['people.write']) });
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
});
