import { act, renderHook } from '@testing-library/react';
import { useHover } from './useHover';

describe('useHover', () => {
    test('starts as not hovered', () => {
        const { result } = renderHook(() => useHover());
        const [isHover] = result.current;

        expect(isHover).toBe(false);
    });

    test('becomes hovered after onMouseEnter', () => {
        const { result } = renderHook(() => useHover());

        act(() => {
            const [, bind] = result.current;
            bind.onMouseEnter();
        });

        const [isHover] = result.current;
        expect(isHover).toBe(true);
    });

    test('stops being hovered after onMouseLeave', () => {
        const { result } = renderHook(() => useHover());

        act(() => {
            const [, bind] = result.current;
            bind.onMouseEnter();
        });
        act(() => {
            const [, bind] = result.current;
            bind.onMouseLeave();
        });

        const [isHover] = result.current;
        expect(isHover).toBe(false);
    });
});
