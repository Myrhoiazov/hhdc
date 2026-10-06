import { renderDashboard } from './screens/dashboard';
import { renderNewStudent } from './screens/new-student';
import { renderSearch } from './screens/search';
import { initializeTelegram } from './telegram';

initializeTelegram();

const app = document.getElementById('app');
const nav = document.getElementById('nav');
// Keys here must match the `id`s in server/src/modules/telegram-admin-bot/telegram-admin-bot.menu.ts's
// MINI_APP_SCREENS — that file builds the bot's root-menu web_app buttons as `?screen=<id>`,
// this map is the client half of that contract.
const screens = { dashboard: renderDashboard, search: renderSearch, 'new-student': renderNewStudent };
type ScreenName = keyof typeof screens;

const isScreenName = (value: string | null): value is ScreenName => value !== null && value in screens;

const showScreen = (name: ScreenName) => {
    if (!app) return;
    nav?.querySelectorAll<HTMLButtonElement>('button[data-screen]').forEach((button) => {
        if (button.dataset.screen === name) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
    void screens[name](app);
    app.focus({ preventScroll: true });
};

nav?.querySelectorAll<HTMLButtonElement>('button[data-screen]').forEach((button) => {
    button.addEventListener('click', () => showScreen(button.dataset.screen as ScreenName));
});

const requestedScreen = new URLSearchParams(window.location.search).get('screen');
showScreen(isScreenName(requestedScreen) ? requestedScreen : 'dashboard');
