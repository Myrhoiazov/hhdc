import { act, renderHook } from '@testing-library/react';
import { SEARCH_DELAY_MS } from '../useDelayed/useDelayed';
import { useListFilters } from './useListFilters';

const NONE = { q: '', status: '' };

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('a list opens on the first page without filters', () => {
    const { result } = renderHook(() => useListFilters(NONE));
    expect(result.current.page).toBe(1);
    expect(result.current.applied).toEqual(NONE);
    expect(result.current.filtered).toBe(false);
});

test('a list opens where the address says', () => {
    const { result } = renderHook(() => useListFilters(NONE, { filters: { q: 'anna', status: 'ACTIVE' }, page: 3 }));
    expect(result.current.page).toBe(3);
    expect(result.current.applied).toEqual({ q: 'anna', status: 'ACTIVE' });
});

test('changing a filter returns to the first page and applies at once', () => {
    const { result } = renderHook(() => useListFilters(NONE));
    act(() => { result.current.setPage(4); });
    act(() => { result.current.change({ status: 'ACTIVE' }); });
    expect(result.current.page).toBe(1);
    expect(result.current.applied.status).toBe('ACTIVE');
    expect(result.current.filtered).toBe(true);
});

test('typed search is applied trimmed and only after a pause', () => {
    const { result } = renderHook(() => useListFilters(NONE));
    act(() => { result.current.change({ q: ' anna ' }); });
    expect(result.current.filters.q).toBe(' anna ');
    expect(result.current.applied.q).toBe('');

    act(() => { jest.advanceTimersByTime(SEARCH_DELAY_MS); });
    expect(result.current.applied.q).toBe('anna');
});

test('reset clears every filter', () => {
    const { result } = renderHook(() => useListFilters(NONE, { filters: { q: 'anna', status: 'ACTIVE' }, page: 2 }));
    act(() => { result.current.reset(); });
    expect(result.current.filters).toEqual(NONE);
    expect(result.current.page).toBe(1);
});
