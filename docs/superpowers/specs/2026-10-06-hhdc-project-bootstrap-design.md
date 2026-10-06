# HHDC project bootstrap design

## Purpose

Create a new local project named `hhdc` from the existing `hhdc` codebase so work can continue on an event administration platform with its own repository identity, local database, and clean migration history.

## Scope of this stage

This stage is a project bootstrap and isolation step. It will:

- create `/Users/admin/Projects/hhdc` as a copy of the current `hhdc` working tree;
- initialize `/Users/admin/Projects/hhdc` as a brand-new Git repository with no inherited commits, branches, remotes, or tags, then create one initial HHDC commit;
- preserve the current application code as a starting point for the next domain changes;
- replace project identity references such as `hhdc`, DDC branding, package names, compose project names, service/container names, local database names, URLs, and documentation labels with HHDC equivalents where they describe the copied project;
- exclude the source `.git` directory and Git history, existing local dependency/build artifacts, local environment files, database volumes, uploads, and generated runtime data from the new project;
- remove the existing Prisma migration history and create one new initial migration from the copied schema;
- provision a separate local MySQL database through the copied Docker Compose setup;
- keep the database empty apart from the minimum administrative bootstrap needed to log into the local application;
- leave the removal of student-specific concepts, Mollie subscriptions, and the design of event-specific entities for subsequent tasks.

The phrase “clean database” means no production or demo records are copied. It does not mean deleting current schema modules before the new HHDC domain model is agreed.

## Identity and isolation

The copied project must not share mutable local state with `hhdc`. Its Compose project name, database name, database credentials, published ports where necessary, Redis state, and local environment files must be independently configurable. The copy must not contain the source repository’s `.git` directory or source `.env` file.

Searches after the copy will cover tracked source, configuration, scripts, documentation, Docker files, package metadata, and generated project metadata. References that intentionally describe the historical source project will be retained only when clearly marked as migration context; runtime and user-facing HHDC code must not depend on the old identity.

## Database and migrations

The existing migration directory will be discarded in the new project. The Prisma schema will initially remain structurally compatible with the source application so the bootstrap does not silently introduce a partial domain rewrite. A new baseline migration will be generated and applied to the new local database. No source database dump or seed dataset will be imported.

The copied project will include an explicit local setup path that can recreate the database from zero. Any seed command retained for future development must be safe for HHDC and must not run automatically as part of the clean bootstrap.

## Validation

Validation will cover:

1. the source worktree remains unchanged and the new project is on its own branch;
2. no old project identity remains in runtime/configuration references that should have been renamed;
3. the new Compose stack starts with the HHDC database and health checks pass;
4. Prisma can generate the client and apply the new baseline migration to an empty database;
5. the repository’s relevant client/server checks pass, with failures documented when they depend on unavailable external integrations;
6. the new database contains schema only and no copied business records.

## Follow-up domain work

The next design cycle will define HHDC’s event administration model, including the meaning of “client”, event lifecycle, participants or attendees if needed, organizers, venues, schedules, payments, and communication. That cycle will decide which current student, group, schedule, invoice, and Mollie modules are removed, renamed, or replaced.
