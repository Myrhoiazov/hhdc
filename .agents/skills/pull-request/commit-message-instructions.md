# HHDC Admin Commit Message Guidelines

## Core Principles

- **Clarity**: Messages must clearly explain *what* changed and *why*.
- **Security**: NEVER include secrets, API keys, credentials, private URLs, or customer data in commit messages.
- **Consistency**: Follow the Conventional Commits specification strictly.

## Format Structure

Use this format for feature, fix, release, and complex refactor commits:

```text
<type>(<scope>)[!]: <subject>

<body>

Impact:
- <impact-analysis>

<footer>
```

For tiny documentation or chore changes, the header alone is acceptable when the subject is clear.

## 1. Header Line

The header must be **72 characters or less**.

For **Breaking Changes**, append `!` after the type/scope (e.g., `feat!: drop Node 12 support`) to signal a Major version bump.

### Types

Select the most specific type:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting with no logic change
- `refactor`: Code refactoring with no functional change
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependencies, build scripts
- `ci`: CI/CD configuration changes
- `sec`: Security fixes or improvements
- `revert`: Revert a previous commit

### Scope (Optional)

Use the affected module/component (folder) name (lowercase, kebab-case):

- Event domain: `clients`, `contacts`, `events`, `schedule`, `communications`
- Client core: `auth`, `settings`, `users`, `roles`
- Payments: `invoices`, `payments`, `payment-reminders`
- Email: `email`
- Cross-cutting: `api`, `styles`, `prisma`, `server`, `client`, `agents`, `ci`, `config`, `release`

**Constraints**:

- Select exactly **one** scope that best represents the primary change.
- If a change touches more than two distinct scopes, omit the scope entirely or use `core`.
- Do not use comma-separated scopes.

### Subject

- Use **imperative mood** ("Add feature" NOT "Added feature").
- Capitalize the first letter.
- Do not end with a period.
- Be concise but descriptive.

## 2. Body

- **Mandatory** for all `feat`, `fix`, and complex `refactor` changes.
- Separate from subject with a blank line.
- Wrap lines at 72 characters.
- Start with "This change..." to contextualize the description.
- Explain the **motivation** for the change and contrast with previous behavior.
- Use bullet points (`-`) for lists.

## 3. Impact Analysis

Instead of listing file changes, list significant side effects or impacts that may not be visible in the code diff.

- **Migrations**: Prisma schema/data migrations (run `npm run prisma:generate` and a migration)?
- **Deprecations**: Are any APIs or features deprecated?
- **Dependencies**: New external libraries added?
- **Configuration**: Changes to ENV variables or config files?

## 4. Footer / Metadata

- Reference issue tracker IDs explicitly (e.g., GitHub Issues).
- Format: `Ref: #123` or `Fixes: ISSUE-123`.
- Mention breaking changes if any: `BREAKING CHANGE: <description>`.
- Do not add `Co-authored-by`, `Generated-by`, AI attribution trailers, or similar metadata unless the user explicitly asks.

### Example

```text
fix(invoices): validate invoice customer phone before send

This change validates the customer phone field before an invoice is
sent, so incomplete invoices can be corrected in the UI.

Impact:
- Invoices: Prevents sending when the phone field is empty
- Configuration: No new environment variables

Ref: #123
```
