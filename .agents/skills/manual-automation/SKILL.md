---
name: manual-automation
description: Manual browser automation for the HHDC Admin React admin SPA. Use when checking a running client, reproducing visual/UI bugs, inspecting navigation, or validating forms without full automated test coverage.
---

# HHDC Admin Manual Browser Automation

Use this skill for browser-driven checks against the HHDC Admin React SPA when you need to inspect a live UI, reproduce a visual or interaction bug, or validate forms that lack automated coverage. It is intentionally conservative: inspect the running app, avoid restarting services unless the user asks, and never expose secrets.

## Preparation

Read:

- `AGENTS.md`
- `CONTEXT.md` for domain terminology and page structure
- `README.md` for how to run the app

Identify the base URL. The SPA runs on `:3000` via `npm start` from the root in development; a production preview or a deploy supplies a different URL. If the app is not running and starting it is safe, do so; otherwise report the missing prerequisite.

Completion criterion: the browser target is known or the missing prerequisite is reported.

## Navigation

Open the base URL and inspect the changed flow first. Prefer stable selectors and visible labels. For layout work test at least:

- Desktop width.
- Mobile width.

Completion criterion: changed pages or interactions have been exercised in the browser.

## Assertions

Check:

- Page title and main content load; the expected route mounts.
- Header/footer/navigation are present and links resolve.
- Redux-driven state reflects the expected data (dynamic module loaders mount, slices hydrate).
- Forms show expected validation using test data.
- Console has no new JavaScript errors.
- Network requests for changed interactions do not fail unexpectedly.
- Dark theme remains real when styling changed.

Use screenshots only when visual evidence helps. Use DOM/state assertions for pass/fail checks.

## Safety

- Do not submit real customer data.
- Do not reveal DB credentials, `.env` values, or private URLs.
- Do not restart services or edit database content unless the user explicitly approves it.

## Cleanup

Close pages opened for testing when using browser automation. Leave the user's existing tabs and services alone.

## Report

Summarize:

- URL and pages tested.
- Viewports tested.
- Interactions performed.
- Console/network issues.
- Any blockers or skipped checks.
