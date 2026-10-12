import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

// The same password scripts/e2e-setup.sh gives the throwaway database: the environment (CI) or the root .env (local).
const readDatabasePassword = (): string => {
    const fromFile = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')).E2E_DATABASE_PASSWORD : undefined;
    const password = process.env.E2E_DATABASE_PASSWORD || fromFile;
    if (!password) throw new Error('Set E2E_DATABASE_PASSWORD in the environment or in the root .env (see .env.example).');
    return password;
};

const serverEnvironment = {
    MODE: 'development',
    NODE_ENV: 'test',
    PORT: '18081',
    DATABASE_URL: `postgresql://hhdc_e2e:${readDatabasePassword()}@127.0.0.1:55434/hhdc_crm_e2e?schema=public`,
    CLIENT_URL: 'http://127.0.0.1:13001',
    // Generated per run: the isolated server never shares secrets with a local .env.
    SESSION_SECRET: randomBytes(32).toString('hex'),
    APP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    // No polling of mailboxes, Weeztix or Telegram while the browser flows run.
    BACKGROUND_WORKERS: 'off',
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
            testMatch: /app\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium',
            dependencies: ['setup'],
            testIgnore: /.*(\.setup|app\.spec)\.ts/,
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
