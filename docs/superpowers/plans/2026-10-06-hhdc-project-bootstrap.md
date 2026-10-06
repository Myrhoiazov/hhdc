# HHDC Project Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `/Users/admin/Projects/hhdc` as an isolated HHDC project with a fresh Git repository, renamed local configuration, a new Prisma baseline, and a separate empty local database.

**Architecture:** Copy the source working tree while explicitly excluding `.git`, local secrets, dependencies, builds, and runtime data. Rebrand project-level identity in configuration and documentation, preserve the current schema for the next domain-design cycle, then generate and apply one clean Prisma migration to the new MySQL volume.

**Tech Stack:** Git, Docker Compose, MySQL 8, Prisma 6, Node.js/TypeScript, React 19, Express 5.

**Spec:** `docs/superpowers/specs/2026-10-06-hhdc-project-bootstrap-design.md`

## Global Constraints

- The new project must have no inherited commits, branches, remotes, or tags.
- The source `hhdc` working tree and its local database state must remain unchanged.
- No source `.env`, credentials, production data, database dump, uploads, `node_modules`, or build output may be copied into `hhdc`.
- The current Prisma schema remains structurally compatible with the source application during this bootstrap.
- Student and Mollie domain removal is explicitly deferred to the next design cycle.
- No production or external integration is enabled by default in the new local environment.

## Review Focus

- A hidden source `.git` directory or remote would make the new project inherit the old repository identity; Task 1 verifies a fresh repository with one root commit and no remote.
- A copied `.env`, volume, or generated build could leak state or make the project share mutable data; Task 1 verifies these are excluded.
- Partial identity replacement could leave Docker, package metadata, or runtime URLs tied to DDC; Task 2 runs a scoped old-identity scan and checks the renamed Compose resources.
- Reusing old migration directories would preserve the historical migration chain; Task 3 verifies exactly one new baseline migration exists and applies cleanly to an empty database.
- A successful schema migration could still include copied rows; Task 4 checks table counts and confirms no demo seed ran.

### Task 1: Create the isolated HHDC Git repository

**Files:**
- Create: `/Users/admin/Projects/hhdc/` from the source tree
- Create: `/Users/admin/Projects/hhdc/.git/` with a new repository
- Create: `/Users/admin/Projects/hhdc/.env` from the sanitized HHDC values
- Exclude: source `.git`, `.env`, `node_modules`, `client/build`, `server/build`, `.opencode/node_modules`, runtime uploads, and database/runtime artifacts

**Interfaces:**
- Consumes: the clean source commit on `feat/hhdc-project-bootstrap`.
- Produces: an independent working tree ready for HHDC-specific edits.

- [ ] **Step 1: Copy only source-controlled project material**

  Build the destination with an explicit exclusion list. Do not copy the source `.git`, `.env`, dependencies, builds, generated runtime output, or database volumes.

- [ ] **Step 2: Initialize a fresh Git repository**

  Run `git init -b main` in `/Users/admin/Projects/hhdc`, inspect the status, and confirm `git log` has no entries before the initial commit and `git remote -v` is empty.

- [ ] **Step 3: Write the local HHDC environment**

  Copy `.env.example` to `.env` only after changing the local database name/user, container names, Compose network/resource names, and any HHDC local ports needed to coexist with `hhdc`. Keep integration secrets blank or placeholder-only.

- [ ] **Step 4: Verify source isolation**

  Run `git status --short --branch` in both repositories and confirm the source has no changes caused by the copy and the destination has only the expected uncommitted copied files.

### Task 2: Rebrand project and local runtime identity

**Files:**
- Modify: `/Users/admin/Projects/hhdc/package.json`
- Modify: `/Users/admin/Projects/hhdc/package-lock.json`
- Modify: `/Users/admin/Projects/hhdc/.env.example`
- Modify: `/Users/admin/Projects/hhdc/docker-compose.yml`
- Modify: `/Users/admin/Projects/hhdc/docker-compose.dev.yml`
- Modify: `/Users/admin/Projects/hhdc/docker-compose.prod.yml`
- Modify: `/Users/admin/Projects/hhdc/docker-compose.e2e.yml`
- Modify: `/Users/admin/Projects/hhdc/scripts/`
- Modify: `/Users/admin/Projects/hhdc/README.md`, `CONTEXT.md`, and user-facing docs/configuration that identify the runtime project

**Interfaces:**
- Consumes: the isolated destination from Task 1.
- Produces: runtime and documentation configuration that identifies the copied project as HHDC and uses independent Compose resources.

- [ ] **Step 1: Replace project-level identity references**

  Search with `rg -n -i --hidden --glob '!node_modules/**' --glob '!.git/**' 'hhdc|hhdc|ddc[-_ ]crm|hhdc-e2e'` and update references that describe runtime names, package identity, Docker resources, local database names, URLs, titles, or user-facing project documentation. Preserve only historical source references explicitly needed in the bootstrap specification.

- [ ] **Step 2: Make local resource names independent**

  Set the HHDC Compose network, container names, image names, database name/user, and named volumes so starting HHDC cannot address or reuse `hhdc` resources. Keep published ports distinct where both stacks need to run at once.

- [ ] **Step 3: Keep integrations disabled by default**

  Ensure the copied `.env.example` and `.env` contain no real credentials and no enabled Mollie, Telegram, Instagram, email, or AI delivery integration. Keep the current schema/modules available for later domain work.

- [ ] **Step 4: Verify the identity scan**

  Run the scoped old-identity search again and inspect every remaining match. Run Compose config rendering with the HHDC `.env` and verify service, network, volume, image, database, and container names contain no source project identity.

### Task 3: Replace migration history with a clean Prisma baseline

**Files:**
- Delete: `/Users/admin/Projects/hhdc/server/prisma/migrations/`
- Create: `/Users/admin/Projects/hhdc/server/prisma/migrations/<new-baseline>/migration.sql`
- Preserve: `/Users/admin/Projects/hhdc/server/prisma/schema/`

**Interfaces:**
- Consumes: the rebranded HHDC server configuration from Task 2.
- Produces: a Prisma migration history containing only the new baseline for the current schema.

- [ ] **Step 1: Confirm the copied schema is internally consistent**

  Run `npm --prefix server run prisma:generate` and inspect the generated client command output before touching the migration directory.

- [ ] **Step 2: Remove historical migrations in the new repository only**

  Delete the copied `server/prisma/migrations` directory contents in `/Users/admin/Projects/hhdc`; do not modify the source repository.

- [ ] **Step 3: Create the baseline migration**

  Start the HHDC MySQL service, run the repository’s Prisma migration-generation command against the empty HHDC database, and verify the generated SQL creates the current schema without applying source migration names.

- [ ] **Step 4: Apply and inspect the baseline**

  Run the production-style migration command against the new empty database. Verify Prisma’s migration table contains one applied baseline and that the database has no business rows.

### Task 4: Validate a clean local HHDC stack

**Files:**
- Modify: `/Users/admin/Projects/hhdc/README.md` if setup commands or database names need correction
- Modify: `/Users/admin/Projects/hhdc/docs/` only where validation reveals stale bootstrap instructions

**Interfaces:**
- Consumes: the complete HHDC copy and baseline from Tasks 1–3.
- Produces: a runnable local project with documented clean-start commands.

- [ ] **Step 1: Start only the HHDC development stack**

  Run `npm run docker:rebuild` from `/Users/admin/Projects/hhdc` and wait for MySQL, Redis, backend, and frontend health/readiness checks.

- [ ] **Step 2: Verify schema and data state**

  Query the HHDC database through the configured local connection and confirm all expected tables exist, `_prisma_migrations` contains the single baseline, and application business tables contain zero rows unless a minimal admin bootstrap is explicitly required by the existing login setup.

- [ ] **Step 3: Run narrow repository checks**

  Run `npm run docs:links`, `npm --prefix server run build`, `npm --prefix client run lint:ts`, and the relevant client/server tests. Run the full `npm run ci` if the local dependencies and required build variables are available.

- [ ] **Step 4: Commit the fresh HHDC repository**

  Inspect `git diff --check`, the complete status, and the staged file list. Commit the project with `chore: bootstrap HHDC project`, then verify `git log --oneline` shows the new HHDC initial commit and no source history.

