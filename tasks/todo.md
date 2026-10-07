# Todo: Email deletion, inbox pagination, and Telegram notifications

- [x] Task 1: Verify and harden remote-first deletion.
- [x] Task 2: Add incremental inbox loading.
- [x] Task 3: Add privacy-safe Telegram operational notifications.
- [x] Task 4: Import the newest 200 IMAP messages by position, not by UID distance.
- [x] Task 5: Compose and send a new email from a modal (plain text, one recipient).
- [x] Task 6: Attach files (up to 5, 10 MB each) to a new email and to a reply.
- [x] Checks passed (`npm run ci` from the root; server and client suites re-run after the last edits).
- [x] Code review passed (findings fixed: list collapse on read, repeated sync alerts, duplicate and historical Telegram alerts, real chat id in `.env.example`).
- [ ] Browser QA: blocked — the automation browser shows an error page for `localhost:3011`; check light/dark and mobile manually.
- [ ] Ready for PR (after manual browser QA).
