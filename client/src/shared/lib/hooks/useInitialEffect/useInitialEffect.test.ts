import { renderHook } from '@testing-library/react';
import { useInitialEffect } from './useInitialEffect';

describe('useInitialEffect', () => {
    test('calls the callback once on mount', () => {
        const callback = jest.fn();
        renderHook(() => useInitialEffect(callback));

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('does not call the callback again on rerender', () => {
        const callback = jest.fn();
        const { rerender } = renderHook(() => useInitialEffect(callback));

        rerender();
        rerender();

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
