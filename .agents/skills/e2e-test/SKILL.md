---
name: e2e-test
description: Browser QA for the HHDC Admin React admin SPA. Use when client templates, forms, front-end JavaScript, SCSS/CSS, navigation, or user-facing pages change.
---

# HHDC Admin Browser QA

Use this skill to verify user-facing behavior in the HHDC Admin React 19 admin SPA. It complements static checks; it does not replace client lint/tests, server build/domain tests, review, or secret scans.

## Inputs

Before testing, read:

- `AGENTS.md`
- `CONTEXT.md` for domain terminology and page/slice structure
- `README.md` for how to run the app

Determine the base URL. In development the SPA runs on `:3000` via `npm start` from the root (webpack-dev-server) with the API behind the dev proxy. A production preview or a deploy may supply a different URL. If no URL can be discovered, report that browser QA is blocked and continue with static verification.

Completion criterion: a reachable base URL is known, or the blocker is documented.

## Server/Spa Readiness

Prefer checking the running app instead of restarting services.

1. Confirm the dev app is up (`npm start` from the root serves client on `:3000`).
2. Probe the base URL with `curl -I` or a browser navigation.
3. If the app is unavailable, identify the missing prerequisite without stopping unrelated services.
4. Do not edit `.env` or database content to make QA pass.

Completion criterion: a reachable base URL is known, or the blocker is documented.

## Pages to Check

Choose the flows affected by the diff first. When unsure, include:

- The login/session flow if auth changed.
- The event-client or contact flow if the domain changed.
- The event-edition/calendar flow if scheduling changed.
- The payment flow if payments or the provider integration changed.
- The email workflow if message/account handling changed.
- Any changed page under `client/src/pages/` or feature under `client/src/features/`.

Completion criterion: every changed user-facing path has at least one rendered-page check.

## Browser Assertions

Use browser automation (see the `browser-automation` skill for a headless run) or manual inspection to verify:

- The page renders and mounts without console errors.
- Redux-driven state reflects the expected data (dynamic module loaders mount, slices hydrate).
- Navigation and links target the expected routes.
- Forms validate and submit without private customer data unless the user explicitly approves a live interaction.
- Desktop and mobile viewports remain readable when layout changed.
- Dark theme remains real when styling changed (check both themes).

Prefer DOM/state assertions for exact checks and screenshots for layout evidence.

## Form Safety

Do not submit real private customer data during QA. Use test data and stop before any live submission unless the task specifically requires it and the user approved it.

## Reporting

Report:

- Base URL tested.
- Pages and viewports checked.
- Console/network/form findings.
- Any skipped checks and why.

Completion criterion: the report gives enough detail for another agent or human to reproduce the QA result.
