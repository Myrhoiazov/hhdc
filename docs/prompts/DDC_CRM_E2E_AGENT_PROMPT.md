# Agent Prompt — Implement E2E Testing in HHDC Admin

## Role

Ты работаешь в репозитории **HHDC Admin**.

Твоя задача — внедрить надежный слой end-to-end testing для существующего приложения, не нарушая текущую архитектуру и не создавая лишний framework/abstraction.

Основная спецификация:

```text
docs/spec/DDC_CRM_E2E_TESTING_SPEC.md
```

Если файл находится в другом пути — используй фактический путь, который дал пользователь.

---

# Goal

Реализовать E2E infrastructure и первый стабильный vertical business flow:

```text
Browser
→ React client
→ Express API
→ Prisma
→ isolated MySQL test database
```

Предпочтительный framework — **Playwright**, но сначала проверь, нет ли уже существующего E2E framework.

Главная задача первого этапа:

1. reproducible E2E environment;
2. deterministic test data;
3. app smoke test;
4. real login smoke test;
5. protected route test;
6. один полный CRUD/business flow;
7. удобный local command;
8. минимальная CI integration или готовый безопасный patch для нее.

---

# Hard rules

## 1. Сначала discovery, потом код

Не начинай установку пакетов и создание файлов сразу.

Сначала исследуй фактическое состояние проекта.

Прочитай:

```text
AGENTS.md
```

После этого открывай только ссылки/документы, реально нужные для задачи.

Не загружай весь `docs/spec/*`, `docs/domain/*` или `.agents/skills/*`.

---

## 2. Search-first protocol

Когда точный файл неизвестен:

```text
Graphify
→ rg
→ targeted read
→ full file only as last resort
```

Если Graphify недоступен — начинай с `rg`.

Минимально исследуй:

```bash
rg -n "playwright|cypress|e2e|vitest|jest" .
rg -n "\"scripts\"|\"test\"|\"ci\"|\"dev\"" package.json client/package.json server/package.json
rg -n "healthcheck|health" server
rg -n "login|auth|session|token" client server
rg -n "seed|PrismaClient|prisma" server package.json
rg -n "docker-compose|docker compose" .
rg -n "github/workflows|bitbucket|pipeline|ci" .
```

Адаптируй команды к реальной структуре.

Не выполняй бессмысленный широкомасштабный поиск по `node_modules`, build artifacts и generated files.

---

## 3. Сначала составь короткий implementation plan

До изменения файлов сформируй план на основе найденного проекта.

План должен содержать:

```text
A. Existing test setup
B. Existing local startup
C. Existing DB + seed approach
D. Existing auth approach
E. Proposed E2E topology
F. First business vertical slice
G. Files expected to change
H. Risks
```

Не спрашивай подтверждение, если нет блокирующей неоднозначности.

Продолжай реализацию.

---

# Technical requirements

## Framework

Используй существующий E2E framework, если он уже есть.

Если E2E framework отсутствует:

```text
Playwright + TypeScript
```

Не добавляй Cypress параллельно Playwright.

---

## Test topology

Целевой путь:

```text
Playwright
  ↓
React
  ↓
Express
  ↓
Prisma
  ↓
E2E MySQL
```

Не мокай внутренний API HHDC Admin.

Допускается мокировать только внешние third-party dependencies при необходимости.

---

## Database

Найди существующие:

```text
Prisma schema
migrations/db push process
seed
factories/builders
Docker DB service
```

Выбери минимальный deterministic E2E data strategy.

Нельзя использовать production database.

Не копируй огромный production seed.

Создавай только данные, необходимые тестам.

Tests must be independent.

---

## Authentication

Реализуй:

### A. Real login smoke

Хотя бы один тест проходит login полностью через UI.

### B. Reusable authenticated fixture

Остальные authenticated tests могут использовать storage state или другую стандартную Playwright strategy.

Не коммить реальные access tokens, passwords или session data.

---

## Locators

Приоритет:

```text
getByRole
getByLabel
getByPlaceholder
getByText
data-testid only when necessary
```

Не используй:

```text
generated classes
nth-child chains
fragile DOM selectors
```

Если необходим `data-testid`, добавь только минимально нужный.

---

## Waiting

Запрещено маскировать проблемы через:

```ts
page.waitForTimeout(...)
```

Используй Playwright auto-waiting и assertions.

---

# First milestone

Реализуй следующие сценарии.

Названия адаптируй под фактический UI.

## E2E-001 — App smoke

```text
Given frontend and backend are running
When browser opens application
Then app renders expected entry page
```

---

## E2E-002 — Login

```text
Given seeded test user
When user logs in through UI
Then user reaches authenticated area
```

---

## E2E-003 — Protected route

```text
Given anonymous browser context
When protected route is opened
Then app redirects/rejects according to current application contract
```

Не навязывай новую auth behavior — тестируй существующий contract.

---

## E2E-004 — Main entity loads from database

Выбери один наиболее важный и простой CRUD module после изучения domain model и текущего кода.

```text
Given entity exists in test database
When authenticated user opens entity list
Then entity data is visible
```

---

## E2E-005 — Create + persistence

```text
Given authenticated user
When entity is created through UI
Then success result is visible
And after reload the entity still exists
```

Проверка после reload обязательна для подтверждения реального persistence.

---

## E2E-006 — Edit + persistence

```text
Given existing entity
When user edits it through UI
Then updated value is visible
And remains correct after reload
```

Delete/archive добавляй только если это безопасно и логично для выбранного модуля.

---

# API contract concern

Обрати особое внимание на согласованность client/server.

Проект постепенно должен уходить от избыточной загрузки Prisma relations к явным `select`.

E2E должен поймать ситуацию, когда backend перестал отдавать поле, которое ожидает frontend.

Во время тестирования отмечай найденные mismatch:

```text
missing field
nullable mismatch
relation shape mismatch
enum mismatch
ID mismatch
pagination mismatch
date seriaDDCtion issue
permission mismatch
```

Не расширяй Prisma query обратно через `include: true` только чтобы заставить тест пройти.

Исправляй контракт минимально и осознанно.

---

# Implementation workflow

Работай вертикальными slices.

## Slice 1 — Runner

```text
install/config
→ app opens
→ 1 smoke test passes
```

Сразу запусти тест.

Не создавай остальную инфраструктуру, пока первый browser test не запускается.

---

## Slice 2 — Test database

```text
isolated DB
→ schema applied
→ deterministic baseline
→ DB-backed test passes
```

---

## Slice 3 — Authentication

```text
test user
→ real UI login
→ auth fixture/storage state
→ protected route
```

---

## Slice 4 — First business flow

```text
seed entity
→ list
→ create
→ reload/persistence
→ edit
→ reload/persistence
```

---

# Validation loop

После каждого slice:

```text
run narrowest relevant test
→ inspect error
→ fix root cause
→ rerun
→ git diff
```

Не пиши весь suite до первого запуска.

Не используй retry как способ скрыть flaky behavior.

---

# Diagnostics

Настрой Playwright так, чтобы failure был исследуемым.

Предпочтительно:

```text
local retries: 0
CI retries: 1
trace: on-first-retry
screenshot: only-on-failure
video: retain-on-failure
```

На старте достаточно Chromium.

Не добавляй Firefox/WebKit без причины.

---

# Scripts

Добавь минимальный developer interface.

Желательно:

```bash
npm run e2e
npm run e2e:ui
```

Опционально:

```bash
npm run e2e:headed
npm run e2e:debug
```

Если монорепо уже использует workspace conventions — следуй им.

Не плодить scripts без необходимости.

---

# Docker / startup

Сначала проанализируй существующие compose files.

Предпочитай переиспользование существующей инфраструктуры.

Добавляй:

```text
docker-compose.e2e.yml
```

только если это действительно дает чистую изоляцию и простой workflow.

Не копируй весь production compose.

---

# Readiness

Не используй фиксированный sleep.

Backend readiness:

```text
GET /healthcheck → 200
```

или фактический существующий endpoint.

Frontend readiness:

```text
HTTP 200 / configured webServer readiness
```

---

# CI

Сначала найди фактический CI.

Добавляй E2E только после стабильного local run.

Не переписывай pipeline целиком.

Минимальный flow:

```text
install
→ infrastructure
→ DB schema
→ test seed
→ start server/client
→ readiness
→ Playwright
→ artifacts on failure
→ teardown
```

Если CI integration сейчас слишком рискованна:

1. подготовь минимальный отдельный patch/workflow;
2. четко объясни, почему он не был автоматически подключен к required checks.

---

# Documentation

Создай короткую E2E инструкцию.

Она должна объяснять:

```text
install
run
debug
test DB lifecycle
auth fixture
how to add a new spec
```

Не дублируй полную architecture spec.

---

# Scope guard

НЕ делай параллельно:

```text
unrelated refactoring
global architecture cleanup
dependency upgrades
domain renaming
UI redesign
API redesign
mass data-testid injection
migration from current unit test framework
```

Если находишь проблему вне scope:

```text
record it
→ continue task
```

Исправляй только если она блокирует E2E milestone.

---

# Context/token rules

Следуй project contract экономии контекста:

```text
Graphify → rg → targeted read
```

Обязательно:

- не читать весь repository;
- не читать все specs;
- не читать все skills;
- не повторять уже прочитанный неизменившийся файл;
- после изменения смотреть `git diff`, а не перечитывать все;
- narrow test first;
- full CI только на финальной стадии;
- сохранять correctness, даже если иногда нужно прочитать дополнительный код.

---

# Verification

Финальная проверка должна идти от узкой к широкой:

```text
1. selected single E2E test
2. selected business E2E folder
3. full E2E smoke suite
4. relevant existing tests
5. typecheck
6. lint
7. project CI command if practical
```

Не утверждай, что команда прошла, если ты ее не запускал.

---

# Definition of Done

Задача считается выполненной, когда:

- [ ] E2E runner работает локально.
- [ ] Test environment не использует production DB.
- [ ] Test DB имеет reproducible setup/reset.
- [ ] Есть deterministic test user.
- [ ] App smoke test проходит.
- [ ] Real login test проходит.
- [ ] Protected route test проходит.
- [ ] Первый DB-backed list test проходит.
- [ ] Create flow проходит через UI.
- [ ] Create подтвержден после reload.
- [ ] Edit flow проходит через UI.
- [ ] Edit подтвержден после reload.
- [ ] Нет arbitrary sleep.
- [ ] Нет brittle CSS selectors.
- [ ] Failure дает trace/screenshot.
- [ ] Есть простой documented local command.
- [ ] Existing relevant tests/typecheck/lint не сломаны.
- [ ] CI integration реализована либо подготовлена минимальная безопасная версия.

---

# Final response format

В конце не давай длинный рассказ.

Ответ структурируй так:

## Discovered

```text
- test stack:
- app startup:
- DB strategy:
- auth:
- CI:
```

## Implemented

```text
- ...
```

## E2E scenarios

```text
- E2E-001 ...
- E2E-002 ...
```

## Verification

Покажи только реально выполненные команды:

```text
command → PASS/FAIL
```

Если FAIL — укажи короткую причину.

## Changed files

```text
path
path
path
```

## Remaining

Только конкретные необязательные следующие шаги.

---

# Execution directive

Начни с discovery.

Не спрашивай разрешения на каждый шаг.

Сначала докажи E2E architecture одним рабочим vertical slice.

Только затем расширяй покрытие.

Главный приоритет:

**stable, deterministic, maintainable E2E tests with minimum unnecessary project context.**
