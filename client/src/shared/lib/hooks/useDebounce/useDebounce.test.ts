import { renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('calls the callback only once after the delay when called repeatedly', () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useDebounce(callback, 500));

        result.current('a');
        result.current('b');
        result.current('c');

        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('c');
    });

    test('does not call the callback before the delay has elapsed', () => {
        const callback = jest.fn();
        const { result } = renderHook(() => useDebounce(callback, 500));

        result.current();
        jest.advanceTimersByTime(499);

        expect(callback).not.toHaveBeenCalled();
    });
});
