# E2E testing

The E2E suite uses real Chromium, the React SPA, Express API, Prisma, and a
dedicated MySQL database. It never uses the development or production database.

## Run locally

Install the root dependencies once, then run the suite:

```bash
npm install
npm run e2e
```

`e2e` starts the `hhdc-e2e` MySQL compose project on port `13306`, resets its
schema with `prisma db push --force-reset`, seeds a test administrator and a
client, starts the API and SPA, and runs Chromium. The test database is reset on
every run. Tear it down, including its dedicated volume, with:

```bash
npm run e2e:down
```

The SPA uses port `13001` and the API uses `18081`. Playwright starts its own
servers and fails if either port is occupied; it never reuses an existing app.
The API receives a test-only session key from `playwright.config.ts`, so login
does not depend on session secrets in a local `.env` file.

For interactive diagnosis use `npm run e2e:ui`; use `npm run e2e:headed` to
watch the browser. Playwright retains screenshots, video, and a trace on retry
when a test fails.

## Authentication and data

The setup project logs in through `/login` using the seeded E2E-only account and
writes its generated storage state to `playwright/.auth/admin.json`. That file
is ignored by Git. Anonymous route tests use a separate browser project.

The minimal seed is in `server/scripts/e2e-seed.ts`. Add only the data required
by a new scenario there, or create scenario-specific data with a unique name;
do not reuse development data or commit credentials from another environment.

## Adding a test

Place a spec under `e2e/specs/`. Prefer role, label, placeholder, and stable
text locators. Test user-visible outcomes through the real API, and confirm
mutations with a reload when persistence matters. Do not use fixed delays.
