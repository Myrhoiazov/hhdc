---
name: pull-request
description: Create a GitHub pull request for HHDC Admin changes: inspect diffs, create a feature branch, commit with Conventional Commits, push, and open a PR into develop. Use when asked to publish local work for review.
metadata:
   version: 1.0.0
---

# HHDC Admin Pull Request Publishing

Publish HHDC Admin changes as a GitHub pull request into `develop`. This skill stops at PR creation; release (merge into `main`) and production deploy are separate gates owned by the repo owner.

## Prerequisites

- `gh` CLI installed and authenticated.
- Remote `origin` points to `https://github.com/Myrhoiazov/hhdc-crm.git`.
- Relevant checks from `AGENTS.md` have passed or blockers are documented.
- Work is on a `feat/*` or `fix/*` branch off `develop` (see AGENTS.md branching model).

## Process

### 1. Inspect Current State

Run:

- `git status --short --branch`
- `git diff`
- `git diff --staged`
- `git remote -v`

Confirm that staged or unstaged changes do not include:

- Secrets, tokens, passwords, or private URLs.
- `.env`, `.deploy-docker.env`, `.DS_Store`, `node_modules/`, or ignored Graphify output.
- Private customer data or uploads.
- Unrelated user changes.

Completion criterion: the change set is understood and safe to publish.

### 2. Prepare Branch and Message

Choose:

- A short branch name (`feat/...` or `fix/...`).
- One Conventional Commit message.
- A PR title and body that describe behavior and verification, targeting `develop`.

Read `commit-message-instructions.md` from this skill directory and follow it. Do not add `Co-authored-by`, `Generated-by`, AI attribution trailers, or similar metadata unless the user explicitly asks.

Completion criterion: branch name, commit message, PR title, and PR body are ready.

### 3. Commit and Push

Create or switch to the feature branch, stage only intended files, commit, and push to `origin`.

Use non-interactive Git commands. If push fails because network access is blocked, rerun the push with escalation approval.

Completion criterion: the branch exists on `origin`.

### 4. Open Pull Request

The target branch is `develop` (per the HHDC Admin branching model). Create the PR with `gh pr create --base develop`.

If authentication fails, report that `gh auth login` is required.

Completion criterion: a GitHub PR URL is available.

## PR Body

Include:

- Summary of user-facing changes.
- Verification commands and browser QA performed (`npm run ci`, client/server checks, domain tests).
- Notes about skipped checks or deferred release/deploy.
- Issue references when available.
