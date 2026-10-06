import { fireEvent, render, screen } from '@testing-library/react';
import { LangSwitcher } from './LangSwitcher';

const mockChangeLanguage = jest.fn();

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { changeLanguage: mockChangeLanguage, language: 'en' },
    }),
}));

beforeEach(() => {
    mockChangeLanguage.mockClear();
});

test('renders a button for each supported language', () => {
    render(<LangSwitcher />);
    expect(screen.getByRole('button', { name: 'UA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RU' })).toBeInTheDocument();
});

test('marks only the current language as pressed', () => {
    render(<LangSwitcher />);
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'UA' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute('aria-pressed', 'false');
});

test('switches the language when a language button is clicked', () => {
    render(<LangSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'RU' }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('ru');
});

test('does not switch the language until a button is clicked', () => {
    render(<LangSwitcher />);
    expect(mockChangeLanguage).not.toHaveBeenCalled();
});

test('applies the className passed by the parent to the group', () => {
    render(<LangSwitcher className="extra" />);
    expect(screen.getByRole('group', { name: 'Выбор языка' })).toHaveClass('extra');
});
