import { renderHook } from '@testing-library/react';
import { useThrottle } from './useThrottle';

describe('useThrottle', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('calls the callback immediately on first invocation', () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useThrottle(callback, 500));

        result.current('a');

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('a');
    });

    test('ignores calls made within the delay window', () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useThrottle(callback, 500));

        result.current('a');
        result.current('b');
        result.current('c');

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('allows another call once the delay has elapsed', () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useThrottle(callback, 500));

        result.current('a');
        jest.advanceTimersByTime(500);
        result.current('b');

        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith('b');
    });
});
