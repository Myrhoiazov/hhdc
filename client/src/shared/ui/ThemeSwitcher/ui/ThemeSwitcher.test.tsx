import { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeContext } from '@/shared/lib/context/ThemeContext';
import { Theme } from '@/shared/const/theme';
import { ThemeSwitcher } from './ThemeSwitcher';

function renderWithTheme(theme: Theme, setTheme = jest.fn()) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
    );
    return { setTheme, ...render(<ThemeSwitcher />, { wrapper }) };
}

describe('ThemeSwitcher', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('renders a button', () => {
        renderWithTheme(Theme.LIGHT);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('toggles the theme from light to dark when clicked', () => {
        const { setTheme } = renderWithTheme(Theme.LIGHT);

        fireEvent.click(screen.getByRole('button'));

        expect(setTheme).toHaveBeenCalledWith(Theme.DARK);
    });

    test('toggles the theme from dark to light when clicked', () => {
        const { setTheme } = renderWithTheme(Theme.DARK);

        fireEvent.click(screen.getByRole('button'));

        expect(setTheme).toHaveBeenCalledWith(Theme.LIGHT);
    });
});
