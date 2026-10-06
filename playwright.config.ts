import { defineConfig, devices } from '@playwright/test';

const e2eDatabaseUrl = 'mysql://ddc_e2e:ddc_e2e_password@127.0.0.1:13306/ddc_e2e';
const serverEnvironment = {
    MODE: 'development',
    NODE_ENV: 'test',
    PORT: '18081',
    DATABASE_URL: e2eDatabaseUrl,
    CLIENT_URL: 'http://127.0.0.1:13001',
    COOKIE_NAME: 'ddc_e2e_session',
    // Test-only key: keep the isolated server independent of local .env secrets.
    SESSION_TOKEN_SECRET: 'e2e-only-session-token-secret',
    CSRF_SECRET: 'e2e-csrf-secret',
    // Enables the Telegram button/widget and replaces the real oauth.telegram.org
    // round trip with an in-process loop-back — see isOidcTestMode in
    // auth.telegram.oidc-client.ts. Never set outside this E2E config.
    TELEGRAM_OIDC_CLIENT_ID: 'e2e-telegram-client-id',
    TELEGRAM_OIDC_CLIENT_SECRET: 'e2e-telegram-client-secret',
    TELEGRAM_OIDC_REDIRECT_URI: 'http://127.0.0.1:18081/api/v1/auth/telegram/callback',
    TELEGRAM_OIDC_TEST_MODE: 'true',
};

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:13001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // This CRM's actual audience is Russian-speaking staff (every locale
        // key defaults to Russian text, see i18n.ts's fallbackLng handling).
        // Without this, Playwright Chromium reports en-US, i18next-browser-
        // languagedetector picks 'en', and any UI string with a real EN
        // translation entry (most existing keys have none and so silently
        // fall back to their Russian-text key either way, masking this) then
        // renders in English instead of the Russian text real users see.
        locale: 'ru-RU',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'anonymous',
            testMatch: /(app|telegram-login)\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium',
            dependencies: ['setup'],
            testIgnore: /.*(\.setup|app\.spec|telegram-login\.spec)\.ts/,
            use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
        },
    ],
    webServer: [
        {
            command: 'npm --prefix server start',
            url: 'http://127.0.0.1:18081/api/v1/health',
            reuseExistingServer: false,
            env: serverEnvironment,
        },
        {
            command: 'npm --prefix client run start:e2e',
            url: 'http://127.0.0.1:13001',
            reuseExistingServer: false,
            env: { CLIENT_API_URL: 'http://127.0.0.1:18081', E2E: 'true' },
        },
    ],
});
