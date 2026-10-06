import { useContext } from 'react';
import { renderHook } from '@testing-library/react';
import { ThemeContext } from './ThemeContext';

describe('ThemeContext', () => {
    test('defaults to an empty object when there is no provider', () => {
        const { result } = renderHook(() => useContext(ThemeContext));

        expect(result.current).toEqual({});
    });
});
