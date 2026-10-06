interface TelegramWebApp {
    initData: string;
    colorScheme?: 'light' | 'dark';
    ready: () => void;
    expand: () => void;
    onEvent?: (event: 'themeChanged', callback: () => void) => void;
}

declare global {
    interface Window {
        Telegram?: { WebApp?: TelegramWebApp };
    }
}

const telegramWebApp = () => window.Telegram?.WebApp;

export const telegramInitData = () => telegramWebApp()?.initData?.trim() ?? '';

export const initializeTelegram = () => {
    const webApp = telegramWebApp();
    const applyTheme = () => {
        document.documentElement.classList.toggle('app_dark_theme', webApp?.colorScheme === 'dark');
    };
    applyTheme();
    webApp?.onEvent?.('themeChanged', applyTheme);
    webApp?.ready();
    webApp?.expand();
};
