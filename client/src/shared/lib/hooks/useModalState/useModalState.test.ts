import { act, renderHook } from '@testing-library/react';
import { useModalState } from './useModalState';

describe('useModalState', () => {
    test('starts closed by default', () => {
        const { result } = renderHook(() => useModalState());
        expect(result.current.isOpen).toBe(false);
    });

    test('respects the initial value', () => {
        const { result } = renderHook(() => useModalState(true));
        expect(result.current.isOpen).toBe(true);
    });

    test('open and close toggle the state', () => {
        const { result } = renderHook(() => useModalState());
        act(() => {
            result.current.open();
        });
        expect(result.current.isOpen).toBe(true);

        act(() => {
            result.current.close();
        });
        expect(result.current.isOpen).toBe(false);
    });
});