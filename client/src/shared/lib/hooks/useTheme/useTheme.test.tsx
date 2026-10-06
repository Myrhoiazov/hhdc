import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { Theme } from '../../../const/theme';
import { LOCAL_STORAGE_THEME_KEY } from '@/shared/const/localstorage';
import { useTheme } from './useTheme';

function renderWithTheme(theme?: Theme, setTheme = jest.fn()) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
    return { setTheme, ...renderHook(() => useTheme(), { wrapper }) };
}

describe('useTheme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.className = '';
    });

    test('defaults to LIGHT theme when no theme is provided', () => {
        const { result } = renderWithTheme(undefined);

        expect(result.current.theme).toBe(Theme.LIGHT);
    });

    test('returns the theme from context when provided', () => {
        const { result } = renderWithTheme(Theme.DARK);

        expect(result.current.theme).toBe(Theme.DARK);
    });

    test('toggleTheme switches from LIGHT to DARK, persists it, and updates body class', () => {
        const { result, setTheme } = renderWithTheme(Theme.LIGHT);

        act(() => {
            result.current.toggleTheme();
        });

        expect(setTheme).toHaveBeenCalledWith(Theme.DARK);
        expect(localStorage.getItem(LOCAL_STORAGE_THEME_KEY)).toBe(Theme.DARK);
        expect(document.body.className).toBe(Theme.DARK);
    });

    test('toggleTheme switches from DARK to LIGHT', () => {
        const { result, setTheme } = renderWithTheme(Theme.DARK);

        act(() => {
            result.current.toggleTheme();
        });

        expect(setTheme).toHaveBeenCalledWith(Theme.LIGHT);
        expect(localStorage.getItem(LOCAL_STORAGE_THEME_KEY)).toBe(Theme.LIGHT);
    });
});
