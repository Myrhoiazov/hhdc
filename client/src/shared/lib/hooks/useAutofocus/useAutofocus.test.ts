import { act, renderHook } from '@testing-library/react';
import { useAutofocus } from './useAutofocus';

describe('useAutofocus', () => {
    test('returns non-focused state by default', () => {
        const { result } = renderHook(() => useAutofocus<HTMLInputElement>());
        expect(result.current.isFocused).toBe(false);
        expect(result.current.ref.current).toBeNull();
    });

    test('focuses the element when autofocus is true', () => {
        const { result } = renderHook(() => useAutofocus<HTMLInputElement>(true));
        expect(result.current.isFocused).toBe(true);
        expect(result.current.ref.current).toBeNull();
    });

    test('marks focused state via onFocus and clears it via onBlur', () => {
        const { result } = renderHook(() => useAutofocus<HTMLInputElement>());
        act(() => {
            result.current.onFocus();
        });
        expect(result.current.isFocused).toBe(true);

        act(() => {
            result.current.onBlur();
        });
        expect(result.current.isFocused).toBe(false);
    });
});