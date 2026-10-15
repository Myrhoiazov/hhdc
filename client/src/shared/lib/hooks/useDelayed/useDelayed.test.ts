import { act, renderHook } from '@testing-library/react';
import { SEARCH_DELAY_MS, useDelayed } from './useDelayed';

beforeEach(() => {
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
});

test('the value follows only after typing pauses', () => {
    const { result, rerender } = renderHook(({ value }) => useDelayed(value), {
        initialProps: { value: 'a' },
    });
    rerender({ value: 'an' });
    rerender({ value: 'ann' });
    expect(result.current).toBe('a');

    act(() => {
        jest.advanceTimersByTime(SEARCH_DELAY_MS - 1);
    });
    expect(result.current).toBe('a');

    act(() => {
        jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ann');
});
