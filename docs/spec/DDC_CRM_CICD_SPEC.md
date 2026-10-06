# Спецификация: CI/CD, Git Branching и Quality Gates для HHDC Admin

**Статус:** Reviewed (проработана через `grill-with-docs`, реализация ещё не выполнена)\
**Проект:** HHDC Admin\
**Репозиторий:** GitHub\
**Основные ветки:** `develop`, `main`\
**Deployment target:** Production VPS / Docker Compose\
**CI/CD:** GitHub Actions

------------------------------------------------------------------------

## 0. Решения по итогам проработки (2026-08-30)

Ветвление и правила мержа (§3-5, §21-27) приняты как описано, без исключений даже для владельца
репозитория и для `hotfix/*` — см. `docs/adr/0001-develop-main-branch-protection-no-bypass.md`
(gitignored, локально). Required approvals на PR = 0 (только зелёный CI), merge-стратегия —
squash в `develop`, merge commit в `main`.

Часть предложений этой спецификации сознательно **не** принята как есть:

- **§14-20 (автоматический deploy через GitHub Actions/SSH/GitHub Environment)** — deploy остаётся
  ручным (`npm run deploy` с локальной машины владельца), `deploy.yml` отключается как нерабочий
  легаси-артефакт. См. `docs/adr/0002-manual-production-deploy-retire-github-actions-deploy.md`
  (gitignored, локально).
- **§12 (Markdown Link Checker на Python)** — вместо самописного `scripts/markdown-link-checker/main.py`
  используется готовый Node/CLI-инструмент (`markdown-link-check` или `lychee-action`); репозиторий
  целиком Node/TypeScript.
- **§31-32 (Staging, Rollback)** — подтверждены вне скоупа, как и предполагает сама спецификация.
- **§3.3 (`feature/*` как префикс веток)** — фактически принятая и используемая в проекте форма
  короче: `feat/*` (см. AGENTS.md, Mandatory Rules и Git and Pull Requests). Примеры в этой
  спецификации ниже сохраняют `feature/*` как ещё не пересмотренные (спека помечена «реализация ещё
  не выполнена») — при реализации следовать `feat/*`, а не переписанному здесь примеру.

Дополнительно к спецификации: заводим `.github/pull_request_template.md` (What/Why/Testing/Risks,
§26) и корневой `npm run ci` (§11) как единую точку локальной проверки перед push.

Порядок реализации: сначала `ci.yml` доводится до целевой архитектуры (`client-checks`/
`server-checks`/`docs-links`, включая незакомментированные client-тесты/build и server
build+`test:ci`) — это же чинит текущий красный CI на `develop`; GitHub ruleset с этими тремя
required checks включается только после этого, не раньше.

------------------------------------------------------------------------

## 1. Цель

Построить предсказуемый и безопасный процесс разработки и
production-деплоя HHDC Admin.

Система должна обеспечивать:

-   разработку новых функций вне `main`;
-   интеграцию изменений через `develop`;
-   обязательную автоматическую проверку кода;
-   проверку client и server;
-   запуск автоматических тестов;
-   production build до merge;
-   проверку Markdown-ссылок отдельным quality gate;
-   запрет merge при упавшем CI;
-   production deployment только из `main`;
-   невозможность случайного deployment из `feature/*` или `develop`;
-   использование существующего Docker deployment contract;
-   smoke/health check после deployment.

------------------------------------------------------------------------

## 2. Текущее состояние проекта

HHDC Admin является TypeScript monorepo.

Основные части:

``` text
client/     React 19 + Redux Toolkit + TypeScript
server/     Express 5 + Prisma 6 + MySQL + Redis
docker/     Dockerfiles + nginx
docs/       документация
scripts/    repository tooling и deployment
plugins/    локальные ESLint plugins
```

Production архитектура проекта уже предполагает:

``` text
GitHub
   ↓
VPS
   ↓
Docker Compose
   ├── client
   ├── server
   ├── MySQL
   ├── Redis
   └── nginx
```

Существующий deployment contract:

``` bash
npm run deploy
```

который должен использовать существующий:

``` text
scripts/deploy-docker.sh
```

Production health endpoint:

``` text
GET /api/v1/health
```

------------------------------------------------------------------------

## 3. Целевая модель веток

Использовать четыре основных типа веток:

``` text
main
develop
feature/*
fix/*
```

Дополнительно при необходимости:

``` text
hotfix/*
```

### 3.1 `main`

Назначение:

-   только production-ready код;
-   источник production deployment;
-   прямые push запрещены;
-   изменения попадают через Pull Request;
-   merge разрешен только после успешного CI.

### 3.2 `develop`

Назначение:

-   основная интеграционная ветка;
-   содержит следующую потенциальную версию приложения;
-   новые feature/fix ветки создаются преимущественно от нее;
-   прямой production deployment отсутствует.

### 3.3 `feature/*`

Примеры:

``` text
feature/client-search
feature/mollie-reconciliation
feature/payment-reminders
feature/agent-trace-dashboard
```

Жизненный цикл:

``` text
develop
   ↓
feature/*
   ↓
Pull Request
   ↓
develop
```

### 3.4 `fix/*`

Для обычных исправлений, еще не требующих production hotfix.

``` text
develop
   ↓
fix/*
   ↓
develop
```

### 3.5 `hotfix/*`

Используется только для срочных production-исправлений.

``` text
main
 ↓
hotfix/*
 ↓
main
 ↓
production
```

После этого изменение должно также попасть в `develop`.

------------------------------------------------------------------------

## 4. Основной workflow разработки

``` text
feature/*
    │
    │ Pull Request
    ▼
 develop
    │
    │ CI
    ▼
 tested develop
    │
    │ Release Pull Request
    ▼
   main
    │
    │ CI
    ▼
 production deploy
```

Стандартный сценарий:

``` bash
git checkout develop
git pull origin develop

git checkout -b feature/client-search

# development

git add .
git commit -m "feat: improve client search"
git push -u origin feature/client-search
```

Далее создается:

``` text
feature/client-search → develop
```

Когда версия готова к production:

``` text
develop → main
```

через отдельный Pull Request.

------------------------------------------------------------------------

## 5. Создание `develop`

Первичная настройка:

``` bash
git checkout main
git pull origin main

git checkout -b develop
git push -u origin develop
```

После создания ветки необходимо настроить GitHub Ruleset.

------------------------------------------------------------------------

## 6. CI --- общая архитектура

Файл:

``` text
.github/workflows/ci.yml
```

CI должен запускаться для:

``` text
Pull Request → develop
Pull Request → main

push → develop
push → main
```

Целевая конфигурация trigger:

``` yaml
on:
  pull_request:
    branches:
      - develop
      - main

  push:
    branches:
      - develop
      - main
```

------------------------------------------------------------------------

## 7. CI jobs

CI должен быть разделен минимум на три независимых job:

``` text
CI
├── client-checks
├── server-checks
└── docs-links
```

Преимущества:

-   сразу видно область ошибки;
-   checks можно сделать обязательными;
-   jobs могут выполняться параллельно;
-   легче анализировать ошибки;
-   легче расширять pipeline.

------------------------------------------------------------------------

## 8. Client checks

Job:

``` text
client-checks
```

Рабочая директория:

``` text
client/
```

Последовательность:

``` text
checkout
 ↓
setup Node 20
 ↓
npm ci
 ↓
lint TypeScript
 ↓
lint SCSS
 ↓
unit tests
 ↓
production build
```

Обязательные команды:

``` bash
npm ci
npm run lint:ts
npm run lint:scss
npm test
npm run build:prod
```

Любая ошибка должна завершать job со статусом failure.

------------------------------------------------------------------------

## 9. Server checks

Job:

``` text
server-checks
```

Рабочая директория:

``` text
server/
```

Последовательность:

``` text
checkout
 ↓
setup Node 20
 ↓
npm ci
 ↓
Prisma / TypeScript build
 ↓
server tests
```

Build:

``` bash
npm run build
```

Существующие тестовые группы:

``` bash
npm run test:auth
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
```

------------------------------------------------------------------------

## 10. Единый server CI command

Добавить в:

``` text
server/package.json
```

единый orchestration script:

``` json
{
  "scripts": {
    "test:ci": "npm run test:auth && npm run test:mollie && npm run test:search && npm run test:email && npm run test:payment-reminders"
  }
}
```

После этого GitHub Actions должен использовать:

``` bash
npm run test:ci
```

вместо знания внутренней структуры server tests.

Цель:

``` text
GitHub Actions
AI Agent
Developer
      │
      ▼
npm run test:ci
      │
      ▼
единый набор server tests
```

------------------------------------------------------------------------

## 11. Repository-level CI contract

Root `package.json` уже должен оставаться orchestration layer проекта.

Рекомендуется постепенно привести проект к возможности выполнить:

``` bash
npm run ci
```

из корня repository.

Целевая концепция:

``` text
npm run ci
├── client checks
├── server checks
└── repository checks
```

Это особенно важно для AI-агентов.

Агент должен иметь возможность выполнить:

``` text
make changes
    ↓
npm run ci
    ↓
PASS?
├── NO  → исправить
└── YES → создать/обновить PR
```

------------------------------------------------------------------------

## 12. Markdown Link Checker

Проверка Markdown-ссылок должна быть отдельным CI job:

``` text
docs-links
```

Она не должна быть скрыта внутри client или server tests.

Пример:

``` text
✓ client-checks
✓ server-checks
✓ docs-links
```

При ошибке:

``` text
✓ client-checks
✕ server-checks
✓ docs-links
```

или:

``` text
✓ client-checks
✓ server-checks
✕ docs-links
```

Команда должна использовать существующую/реализуемую утилиту Markdown
Link Checker.

Концептуально:

``` bash
python scripts/markdown-link-checker/main.py .
```

Фактический путь и CLI необходимо привязать к реализации утилиты в
repository.

------------------------------------------------------------------------

## 13. CI concurrency

Для CI необходимо включить отмену устаревших запусков одной ветки:

``` yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Пример:

``` text
push #1 → CI running
push #2 → CI starts

CI #1 → cancelled
CI #2 → continues
```

Это уменьшает лишнее использование GitHub Actions.

------------------------------------------------------------------------

## 14. Deployment --- основное правило

Production deployment разрешен только из:

``` text
main
```

Запрещено:

``` text
feature/* → production
fix/*     → production
develop   → production
```

Разрешено:

``` text
main
 ↓
successful CI
 ↓
production deploy
```

------------------------------------------------------------------------

## 15. Deployment trigger

Файл:

``` text
.github/workflows/deploy.yml
```

Если deployment остается связан через `workflow_run`, он должен
реагировать только на успешный CI ветки `main`.

Целевая концепция:

``` yaml
on:
  workflow_run:
    workflows:
      - CI
    branches:
      - main
    types:
      - completed
```

Job дополнительно должен проверять:

``` text
workflow conclusion == success
head branch == main
```

Таким образом:

``` text
feature/* CI ✓  → NO DEPLOY
develop CI ✓    → NO DEPLOY
main CI ✕       → NO DEPLOY
main CI ✓       → DEPLOY
```

------------------------------------------------------------------------

## 16. Production deployment contract

GitHub Actions не должен самостоятельно реализовывать отдельную frontend
deployment архитектуру.

Не использовать как основной production flow:

``` text
cd client
npm ci
npm run build:prod
pm2 restart frontend
```

если production проекта определен как Docker Compose stack.

Вместо этого:

``` text
GitHub Actions
      ↓
SSH
      ↓
production VPS
      ↓
git update main
      ↓
npm run deploy
      ↓
scripts/deploy-docker.sh
      ↓
Docker Compose
```

------------------------------------------------------------------------

## 17. Production Git update

На сервере deployment должен явно работать с `main`.

Пример:

``` bash
cd /var/www/project

git fetch origin main
git checkout main
git pull --ff-only origin main

npm run deploy
```

Использовать:

``` bash
git pull --ff-only
```

чтобы deployment не создавал неожиданные merge commits на сервере.

------------------------------------------------------------------------

## 18. Deployment concurrency

Одновременно должен выполняться максимум один production deployment.

Использовать:

``` yaml
concurrency:
  group: production
  cancel-in-progress: false
```

Новый production deployment не должен аварийно отменять уже
выполняющийся deployment.

------------------------------------------------------------------------

## 19. GitHub Environment

Создать:

``` text
Settings
└── Environments
    └── production
```

Deployment job должен использовать:

``` yaml
environment:
  name: production
```

Production secrets должны храниться на уровне environment.

Минимально:

``` text
SERVER_IP
SERVER_USER
SSH_PRIVATE_KEY
```

Не хранить production credentials:

``` text
в repository
в .env.example
в workflow YAML
в исходном коде
```

------------------------------------------------------------------------

## 20. Production health check

После deployment система должна проверить:

``` text
GET /api/v1/health
```

Успешный deployment:

``` text
Docker deployment
       ↓
containers started
       ↓
health checks
       ↓
GET /api/v1/health
       ↓
HTTP 200
       ↓
DEPLOY SUCCESS
```

Если health/smoke check не проходит:

``` text
DEPLOY FAILURE
```

Workflow не должен сообщать success только потому, что Docker command
завершился.

Существующий `scripts/deploy-docker.sh` должен оставаться владельцем
deployment/smoke-test логики, если эта логика уже реализована в нем.

------------------------------------------------------------------------

## 21. GitHub Ruleset для `develop`

Создать отдельный ruleset.

Target:

``` text
develop
```

Требования:

``` text
Require pull request before merging
Require status checks to pass
Block force pushes
Block branch deletion
```

Required status checks:

``` text
client-checks
server-checks
docs-links
```

Для solo development обязательный reviewer пока не требуется.

------------------------------------------------------------------------

## 22. GitHub Ruleset для `main`

Создать отдельный, более строгий ruleset.

Target:

``` text
main
```

Требования:

``` text
Require pull request before merging
Require status checks to pass
Require branch to be up to date
Block force pushes
Block branch deletion
```

Required checks:

``` text
client-checks
server-checks
docs-links
```

Прямой push в `main` не является нормальным workflow.

------------------------------------------------------------------------

## 23. Merge policy

Основной поток:

``` text
feature/*
    ↓ PR
develop
    ↓ PR
main
```

Запрещенный нормальный поток:

``` text
feature/* → main
```

Исключение:

``` text
hotfix/* → main
```

для production emergency.

После hotfix:

``` text
hotfix
  ↓
main
  ↓
develop
```

чтобы исправление не потерялось в следующем release.

------------------------------------------------------------------------

## 24. Merge strategy

Рекомендуемая стратегия для feature PR:

``` text
Squash and merge
```

Преимущество:

``` text
feature branch
├── fix typo
├── try again
├── tests
├── final fix
└── cleanup

        ↓ squash

develop
└── feat: implement client search
```

Для:

``` text
develop → main
```

можно использовать merge commit, если требуется явно сохранять границы
release.

Главное --- выбрать одну стратегию и использовать ее последовательно.

------------------------------------------------------------------------

## 25. Commit naming

Рекомендуемый формат:

``` text
feat:
fix:
refactor:
test:
docs:
chore:
ci:
```

Примеры:

``` text
feat: add payment reminder dashboard
fix: prevent duplicate Mollie reconciliation
test: add authentication regression tests
docs: update deployment documentation
ci: add server checks to GitHub Actions
```

------------------------------------------------------------------------

## 26. Pull Request requirements

PR должен содержать минимум:

``` text
What
Why
Testing
Risks
```

Пример:

``` markdown
## What
Added payment reminder retry logic.

## Why
Failed reminders were not retried.

## Testing
- npm run test:ci
- client tests
- manual payment reminder test

## Risks
Changes payment reminder scheduling.
```

------------------------------------------------------------------------

## 27. Merge gate

GitHub должен блокировать merge при:

``` text
client-checks ✕
server-checks ✕
docs-links ✕
```

Пример:

``` text
PR → develop

✓ client-checks
✕ server-checks
✓ docs-links

MERGE BLOCKED
```

После исправления:

``` text
✓ client-checks
✓ server-checks
✓ docs-links

MERGE ALLOWED
```

------------------------------------------------------------------------

## 28. Production pipeline

Полный production flow:

``` text
feature/*
    │
    ▼
Pull Request
    │
    ▼
 develop
    │
    ▼
 CI
    │
    ├── client-checks
    ├── server-checks
    └── docs-links
    │
    ▼
all checks passed
    │
    ▼
develop updated
    │
    ▼
Release PR
    │
    ▼
 main
    │
    ▼
 CI
    │
    ▼
all checks passed
    │
    ▼
Deploy Production
    │
    ▼
SSH VPS
    │
    ▼
git pull --ff-only origin main
    │
    ▼
npm run deploy
    │
    ▼
scripts/deploy-docker.sh
    │
    ▼
Docker Compose
    │
    ▼
health/smoke check
    │
    ▼
SUCCESS
```

------------------------------------------------------------------------

## 29. Поведение при ошибках

### CI failure

При ошибке:

``` text
NO MERGE
NO DEPLOY
```

Разработчик/агент исправляет код в той же feature branch.

Новый push автоматически запускает CI повторно.

### Main CI failure

Если CI `main` не прошел:

``` text
NO PRODUCTION DEPLOY
```

### Deploy failure

Если SSH, Docker deployment или health check завершились ошибкой:

``` text
GitHub deployment = failed
```

Ошибка не должна скрываться через `|| true`.

------------------------------------------------------------------------

## 30. Что не делать

Не использовать:

``` text
push feature → automatic production
push develop → automatic production
```

Не разрешать обычный:

``` bash
git push origin main
```

Не дублировать deployment implementation между:

``` text
deploy.yml
scripts/deploy-docker.sh
```

Не считать только frontend lint полноценным CI всего monorepo.

Не хранить production secrets в Git.

Не считать deployment успешным без smoke/health validation.

------------------------------------------------------------------------

## 31. Staging --- следующий этап

Staging не является обязательной частью первой реализации.

Будущая архитектура:

``` text
feature/*
    ↓
develop
    ↓
CI
    ↓
STAGING
    ↓
manual/integration verification
    ↓
develop → main
    ↓
PRODUCTION
```

Возможный mapping:

``` text
develop → staging
main    → production
```

Staging следует добавлять после стабилизации основного CI/CD.

------------------------------------------------------------------------

## 32. Rollback --- следующий этап

После базового CI/CD необходимо отдельно реализовать rollback strategy.

Целевая концепция:

``` text
deploy version N
      ↓
health failed
      ↓
rollback
      ↓
version N-1
```

В первой версии запрещено делать фиктивный rollback через случайный
`git reset` без формального deployment contract.

------------------------------------------------------------------------

## 33. AI Agent integration

CI должен быть пригоден для автоматизированной разработки агентами.

Целевая модель:

``` text
AI Agent
   ↓
create feature branch
   ↓
modify code
   ↓
run local CI contract
   ↓
fix failures
   ↓
push
   ↓
create PR → develop
   ↓
GitHub CI
   ↓
human review / merge
```

AI Agent не должен:

``` text
push directly to main
deploy production directly
disable CI
skip failed tests
modify production secrets
```

------------------------------------------------------------------------

## 34. Целевая структура GitHub Actions

``` text
.github/
└── workflows/
    ├── ci.yml
    └── deploy.yml
```

На первом этапе двух workflow достаточно.

Не требуется создавать отдельный workflow для каждого теста.

Jobs внутри `ci.yml`:

``` text
client-checks
server-checks
docs-links
```

------------------------------------------------------------------------

## 35. Definition of Done --- CI

CI считается реализованным, когда:

-   [ ] `develop` создан;
-   [ ] CI работает на PR в `develop`;
-   [ ] CI работает на PR в `main`;
-   [ ] CI работает после изменения `develop`;
-   [ ] CI работает после изменения `main`;
-   [ ] client TypeScript lint выполняется;
-   [ ] client SCSS lint выполняется;
-   [ ] client tests выполняются;
-   [ ] client production build выполняется;
-   [ ] server build выполняется;
-   [ ] server tests выполняются;
-   [ ] существует единый `server:test:ci` contract;
-   [ ] Markdown links проверяются отдельным job;
-   [ ] failed check блокирует merge;
-   [ ] устаревшие CI runs отменяются.

------------------------------------------------------------------------

## 36. Definition of Done --- CD

CD считается реализованным, когда:

-   [ ] deployment запускается только после successful CI `main`;
-   [ ] `develop` не может инициировать production deployment;
-   [ ] `feature/*` не может инициировать production deployment;
-   [ ] deployment использует GitHub `production` environment;
-   [ ] production secrets вынесены в environment secrets;
-   [ ] VPS явно checkout/pull `main`;
-   [ ] используется `git pull --ff-only`;
-   [ ] deployment вызывается через `npm run deploy`;
-   [ ] Docker deployment остается внутри существующего deployment
    contract;
-   [ ] одновременно выполняется только один production deployment;
-   [ ] health/smoke check выполняется;
-   [ ] failed health check делает workflow failed.

------------------------------------------------------------------------

## 37. Definition of Done --- GitHub protection

-   [ ] создан Ruleset для `develop`;
-   [ ] создан Ruleset для `main`;
-   [ ] PR обязателен для `develop`;
-   [ ] PR обязателен для `main`;
-   [ ] `client-checks` required;
-   [ ] `server-checks` required;
-   [ ] `docs-links` required;
-   [ ] force push запрещен;
-   [ ] deletion защищенных веток запрещен;
-   [ ] `main` требует актуального состояния branch/checks;
-   [ ] обычный direct push в `main` исключен из рабочего процесса.

------------------------------------------------------------------------

## 38. Порядок реализации

### Phase 1 --- Branching

1.  Создать `develop`.
2.  Push `develop` в GitHub.
3.  Настроить Ruleset для `develop`.
4.  Настроить Ruleset для `main`.

### Phase 2 --- CI

5.  Переписать triggers `ci.yml`.
6.  Разделить CI на `client-checks`, `server-checks`, `docs-links`.
7.  Добавить client tests.
8.  Добавить client production build.
9.  Добавить server build.
10. Создать `server npm run test:ci`.
11. Подключить server tests.
12. Подключить Markdown Link Checker.
13. Добавить CI concurrency.

### Phase 3 --- Deployment

14. Ограничить `deploy.yml` веткой `main`.
15. Проверять successful CI.
16. Создать GitHub Environment `production`.
17. Перенести production secrets.
18. Удалить frontend-only/PM2 deployment из workflow, если он больше не
    является production contract.
19. Вызывать `npm run deploy`.
20. Проверить Docker deployment.
21. Проверить health/smoke check.
22. Добавить deployment concurrency.

### Phase 4 --- Validation

23. Создать тестовую `feature/ci-validation`.
24. Создать PR → `develop`.
25. Намеренно сломать один check и убедиться, что merge заблокирован.
26. Исправить check.
27. Merge → `develop`.
28. Убедиться, что production deploy не запустился.
29. Создать PR `develop → main`.
30. Проверить required checks.
31. Merge в `main`.
32. Проверить запуск production deployment.
33. Проверить `/api/v1/health`.
34. Проверить финальный статус GitHub deployment.

------------------------------------------------------------------------

## 39. Итоговая архитектура

``` text
                       DEVELOPMENT

                       develop
                          │
              ┌───────────┴───────────┐
              │                       │
         feature/*                  fix/*
              │                       │
              └───────────┬───────────┘
                          │
                          ▼
                    Pull Request
                          │
                          ▼

                          CI
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
           CLIENT       SERVER       DOCS
              │           │           │
              └───────────┼───────────┘
                          │
                       ALL PASS
                          │
                          ▼
                       develop
                          │
                          │ Release PR
                          ▼

                         main
                          │
                          ▼
                          CI
                          │
                       ALL PASS
                          │
                          ▼

                     PRODUCTION
                          │
                          ▼
                    GitHub Environment
                          │
                          ▼
                         SSH
                          │
                          ▼
                         VPS
                          │
                          ▼
                  git update main
                          │
                          ▼
                    npm run deploy
                          │
                          ▼
                deploy-docker.sh
                          │
                          ▼
                  Docker Compose
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
           client       server      infrastructure
                          │
                          ▼
                   /api/v1/health
                          │
                          ▼
                       SUCCESS
```

------------------------------------------------------------------------

## 40. Главный CI/CD контракт

Вся архитектура должна соблюдать четыре правила:

``` text
1. feature/fix никогда не деплоятся в production.

2. develop является интеграционной веткой,
   но не production source.

3. main является единственным источником
   production deployment.

4. production deployment возможен только
   после успешного CI main.
```

Итоговый принцип:

``` text
CODE
 ↓
TEST
 ↓
REVIEW
 ↓
MAIN
 ↓
DEPLOY
 ↓
VERIFY
```

`main` должен всегда означать:

> код прошел обязательные проверки и считается готовым к production.
