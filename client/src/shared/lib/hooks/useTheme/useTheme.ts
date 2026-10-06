import { useContext } from 'react';
import { ThemeContext } from '../../../lib/context/ThemeContext';
import { Theme } from '../../../const/theme';
import { LOCAL_STORAGE_THEME_KEY } from '@/shared/const/localstorage';

interface UseThemeResult {
    toggleTheme: () => void;
    theme: Theme;
}

export function useTheme(): UseThemeResult {
    const { theme, setTheme } = useContext(ThemeContext);

    const toggleTheme = () => {
        const newTheme = theme === Theme.DARK ? Theme.LIGHT : Theme.DARK;
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme);
        window.document.body.className = newTheme;
        setTheme?.(newTheme);
    };

    return {
        theme: theme || Theme.LIGHT,
        toggleTheme,
    };
}
