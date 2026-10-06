# HHDC Admin — E2E Testing Specification

## 1. Цель

Внедрить в HHDC Admin надежный слой end-to-end тестирования, который проверяет ключевые пользовательские сценарии через реальное взаимодействие:

**Browser → React client → Express API → Prisma → MySQL**

E2E-тесты должны ловить ошибки интеграции между клиентом и сервером, несовпадение API-контрактов, проблемы авторизации, маршрутизации, форм, мутаций и отображения данных.

E2E не должны заменять unit/integration tests. Их задача — покрыть наиболее важные бизнес-потоки целиком.

---

## 2. Контекст проекта

Текущий стек:

- Monorepo
- Client: React 19 + TypeScript
- Frontend architecture: FSD
- Server: Express 5 + TypeScript
- ORM: Prisma 6
- Database: MySQL
- Node.js: 20.11.0
- Docker используется для локальной инфраструктуры
- Основные источники правил:
  - `AGENTS.md`
  - `README.md`
  - `CONTEXT.md`
  - `docs/domain/*`
  - `docs/spec/*`
  - `docs/adr/*`
  - `.agents/skills/*`

Перед реализацией агент обязан проверить фактическую структуру репозитория и существующий test/tooling setup.

---

## 3. Основные принципы

### 3.1. E2E проверяет поведение пользователя

Тесты должны строиться вокруг пользовательского результата, а не внутренней реализации.

Хорошо:

```text
Пользователь авторизуется → открывает список клиентов → создает клиента →
видит сохраненные данные после reload.
```

Плохо:

```text
Проверить, что React-компонент X вызвал функцию Y.
```

---

### 3.2. Проверяем настоящий frontend + backend

По умолчанию запрещено мокать собственный backend приложения.

Основной E2E путь:

```text
Playwright
    ↓
React
    ↓
HTTP API
    ↓
Express
    ↓
Prisma
    ↓
Test MySQL
```

Допускается мокирование только внешних систем, если они:

- нестабильны;
- платные;
- недоступны локально;
- не принадлежат HHDC Admin.

---

## 4. Предпочтительный инструмент

Предпочтительный runner:

**Playwright**

Причины:

- Chromium / Firefox / WebKit;
- хороший TypeScript API;
- auto-waiting;
- fixtures;
- traces/screenshots/video;
- API helpers;
- удобный CI;
- parallel execution;
- устойчивые browser assertions.

Перед установкой проверить, нет ли уже существующего E2E framework.

Не добавлять второй E2E framework без необходимости.

---

## 5. Предлагаемая структура

Фактические пути агент должен адаптировать после discovery.

Пример:

```text
/
├── client/
├── server/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts
│   │   └── test-data.fixture.ts
│   │
│   ├── helpers/
│   │   ├── api.ts
│   │   ├── db.ts
│   │   └── auth.ts
│   │
│   ├── pages/
│   │   └── ...
│   │
│   ├── specs/
│   │   ├── auth/
│   │   ├── customers/
│   │   └── ...
│   │
│   └── README.md
│
├── playwright.config.ts
└── ...
```

Не создавать abstraction layers заранее.

Page Object использовать только там, где он реально уменьшает повторение.

---

## 6. Test environment

E2E должны работать в изолированном окружении.

Минимально:

```text
Frontend test instance
Backend test instance
Dedicated MySQL test database
```

Нельзя запускать destructive E2E tests против production database.

Рекомендуемый env:

```text
NODE_ENV=test
DATABASE_URL=<e2e database>
E2E_BASE_URL=http://localhost:<frontend-port>
API_BASE_URL=http://localhost:<backend-port>
```

Секреты не коммитить.

При необходимости добавить:

```text
.env.e2e.example
```

---

## 7. Управление базой данных

Главная цель:

> Каждый тест должен получать предсказуемое состояние данных.

Подход выбрать после анализа существующих seed/factory механизмов.

Приоритет:

1. существующие factories;
2. существующий seed;
3. test builders;
4. минимальный новый E2E seed helper.

Не копировать большой production seed без необходимости.

### Требования

Каждый E2E scenario должен:

- создавать только необходимые данные;
- не зависеть от порядка выполнения других тестов;
- не зависеть от данных предыдущего запуска;
- иметь deterministic IDs/data либо получать созданные сущности через fixtures;
- очищать состояние или использовать гарантированный reset strategy.

---

## 8. Database reset strategy

Агент должен определить наиболее безопасный вариант.

Предпочтительно один из:

### Option A — reset перед test suite

```text
migrate/reset
→ seed minimal baseline
→ run suite
```

Подходит для тестов, которые не конфликтуют между собой.

### Option B — reset перед каждым test

Самая высокая изоляция, но медленнее.

### Option C — worker-isolated data

Каждый Playwright worker создает данные с уникальным namespace.

Подходит для parallel tests.

Не включать parallel execution, пока тесты не доказали независимость.

---

## 9. Миграции

E2E environment должен использовать схему Prisma, соответствующую приложению.

Перед suite:

```text
database available
→ Prisma schema applied
→ baseline seeded
→ server started
→ client started
→ tests
```

Не создавать отдельную вручную поддерживаемую схему БД для E2E.

---

## 10. Authentication

Авторизацию нужно тестировать на двух уровнях.

### Auth smoke test

Хотя бы один сценарий обязан пройти реальный UI login.

Пример:

```text
open login
→ enter credentials
→ submit
→ authenticated redirect
→ protected page visible
```

### Auth fixture

Остальные сценарии могут использовать storage state / fixture, чтобы не выполнять UI login перед каждым тестом.

Например:

```text
playwright/.auth/user.json
```

Но этот state должен генерироваться автоматически.

Не коммитить реальные credentials/session tokens.

---

## 11. Селекторы

Приоритет селекторов:

1. `getByRole`
2. `getByLabel`
3. `getByPlaceholder`
4. `getByText` — только если текст стабилен
5. `data-testid` — когда semantic selector недостаточен

Запрещено строить тесты на:

- случайных CSS class names;
- generated selectors;
- сложных DOM chains;
- layout structure.

Пример:

```ts
page.getByRole('button', { name: 'Save' })
```

лучше чем:

```ts
page.locator('.modal > div:nth-child(2) button.primary')
```

---

## 12. Assertions

Проверять пользовательский результат.

Пример:

```text
create customer
→ success state
→ row appears
→ reload
→ row still exists
```

Недостаточно проверить только toast:

```text
"Saved successfully"
```

если операция могла не сохраниться в БД.

Для критических CRUD flows желательно подтверждать persistent state.

---

## 13. Initial E2E scope

Не пытаться сразу покрыть весь CRM.

### Phase 1 — Infrastructure + smoke

1. Playwright setup.
2. Test DB strategy.
3. Application startup.
4. Health/smoke navigation.
5. Login.
6. Protected route.

### Phase 2 — один основной CRUD module

Выбрать один бизнес-модуль после анализа domain model.

Пример:

```text
list
→ open/create
→ save
→ verify
→ edit
→ verify
→ optionally delete/archive
```

Только после стабилизации этого vertical slice переходить к следующему модулю.

### Phase 3 — критические business flows

Приоритет отдавать сценариям:

- авторизация;
- CRUD критичных сущностей;
- связи между сущностями;
- роли и permissions;
- фильтрация/поиск, если это важно для работы;
- critical forms;
- navigation between related entities.

---

## 14. Что НЕ тестировать через E2E

Не использовать E2E для:

- каждой utility function;
- каждой server validation function;
- каждого React component;
- всех edge cases API;
- Prisma implementation details;
- внутренних mapper functions.

Для этого предпочтительнее unit/integration tests.

---

## 15. Recommended smoke suite

Минимальный smoke suite:

```text
E2E-001 App loads
E2E-002 Login succeeds
E2E-003 Unauthorized user cannot open protected route
E2E-004 Main navigation works
E2E-005 Main business entity list loads from backend
E2E-006 Entity can be created and persists
E2E-007 Entity can be edited and persists
```

Фактическое название business entity определить через domain discovery.

---

## 16. API synchronization checks

Так как одна из целей проекта — согласованность frontend ↔ backend, E2E должны отдельно ловить:

- отсутствующие поля;
- неправильные nullable значения;
- неправильные relation shapes;
- неправильные IDs;
- enum mismatch;
- date/time formatting problems;
- pagination mismatch;
- permission errors;
- frontend assumptions о вложенных объектах, которых API больше не возвращает.

Если UI использует данные после перехода backend на Prisma `select`, E2E должен подтвердить, что клиент получает все необходимые поля.

---

## 17. Fixtures

Fixtures должны быть маленькими и композиционными.

Пример:

```text
authenticatedUser
customer
teacher
subscription
```

Не создавать одну огромную `everythingFixture`.

Fixture должна отвечать на вопрос:

> Какое минимальное состояние нужно сценарию?

---

## 18. Test naming

Название теста должно описывать business outcome.

Хорошо:

```ts
test('user can create a customer and see it after page reload')
```

Плохо:

```ts
test('customer test 1')
```

---

## 19. Test IDs

`data-testid` добавлять только когда semantic locator недостаточен.

Формат:

```text
domain-element-purpose
```

Пример:

```text
customer-form-save
customer-row
subscription-status
```

Не добавлять test IDs массово заранее.

---

## 20. Flakiness policy

Запрещено использовать arbitrary sleeps:

```ts
await page.waitForTimeout(3000)
```

кроме доказанной специфической необходимости.

Использовать:

- Playwright auto-wait;
- locator assertions;
- network response waits;
- URL assertions;
- visible/enabled assertions.

Пример:

```ts
await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
```

---

## 21. Retry policy

Локально:

```text
retries = 0
```

CI:

```text
retries = 1
```

Retry не должен скрывать flaky test.

Если тест проходит только после retry — считать это проблемой.

---

## 22. Diagnostics

При падении в CI сохранять как artifacts:

- Playwright trace;
- screenshot;
- failure logs;
- при необходимости video.

Рекомендуется:

```text
trace: on-first-retry
screenshot: only-on-failure
video: retain-on-failure
```

---

## 23. Browser matrix

На первом этапе не запускать полный matrix.

Начать:

```text
Chromium
```

После стабилизации при реальной необходимости добавить:

```text
Firefox
WebKit
```

Цель — быстрый feedback loop, а не максимальное количество browser jobs с первого дня.

---

## 24. npm scripts

Адаптировать к package manager проекта.

Желаемый interface:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "e2e:debug": "playwright test --debug"
  }
}
```

Дополнительно может быть:

```text
e2e:setup
e2e:db:reset
e2e:ci
```

Не создавать лишние scripts, если compose/setup уже решает задачу.

---

## 25. Local developer workflow

Желаемый UX:

```bash
npm run e2e
```

или одна короткая documented sequence.

Разработчику не нужно вручную:

- создавать тестового пользователя;
- заполнять БД;
- копировать токены;
- запускать 5 отдельных процессов.

Если полная автоматизация старта слишком сильно ломает существующий workflow, допускается documented two-step setup.

---

## 26. Docker

Перед добавлением нового compose файла проверить текущую Docker architecture.

Предпочтения:

- переиспользовать существующие services;
- создать отдельную test DB/service только если нужна изоляция;
- не дублировать production compose целиком.

Возможный вариант:

```text
docker-compose.e2e.yml
```

только если он действительно упрощает запуск.

---

## 27. CI integration

E2E добавлять в CI только после стабильной локальной работы.

Pipeline:

```text
install
→ build / prepare
→ start test infrastructure
→ prisma schema/migrations
→ seed
→ start backend
→ start frontend
→ wait for readiness
→ playwright test
→ upload artifacts on failure
→ teardown
```

---

## 28. CI policy

На первом этапе E2E можно запускать:

- pull request;
- manual workflow;
- main/develop — в зависимости от текущей CI architecture.

Агент обязан сначала исследовать текущий pipeline.

Не переписывать CI целиком ради E2E.

---

## 29. Readiness checks

Не использовать слепой sleep для запуска приложения.

Использовать HTTP readiness.

Например:

```text
backend /healthcheck → 200
frontend URL → 200
```

Только после этого запускать Playwright.

---

## 30. Performance targets

Для первой smoke suite:

```text
target: максимально короткий feedback loop
```

Ориентир:

- smoke suite — до нескольких минут;
- отдельный тест — обычно секунды, не десятки секунд.

Если E2E suite начинает быстро расти, разделить:

```text
@smoke
@critical
@regression
```

Не вводить категории до появления реальной необходимости.

---

## 31. Documentation

Добавить короткий E2E README.

Он должен отвечать только на практические вопросы:

```text
How to install
How to run
How test DB works
How to debug
How to add a test
How auth fixture works
```

Не дублировать всю эту спецификацию.

---

## 32. Agent discovery protocol

Перед изменениями агент обязан:

1. Прочитать `AGENTS.md`.
2. Определить релевантные ссылки на deeper docs.
3. Использовать Graphify для навигации по symbols/dependencies, если доступен.
4. Использовать `rg` для поиска:
   - существующих тестов;
   - package scripts;
   - auth logic;
   - healthcheck;
   - Prisma seed;
   - Docker;
   - CI.
5. Читать только релевантные диапазоны файлов.
6. Проверить `git status`.
7. Не загружать весь repository context.

Пример поисков:

```bash
rg -n "playwright|cypress|e2e|vitest|jest" .
rg -n "\"test\"|\"ci\"|\"dev\"" package.json client/package.json server/package.json
rg -n "healthcheck|health" server
rg -n "seed|prisma" server package.json
rg -n "login|auth|session|token" client server
rg -n "docker compose|docker-compose" .
```

---

## 33. Implementation policy for the agent

Работать маленькими вертикальными итерациями.

### Slice 1

```text
tool installed
→ config
→ browser opens app
→ one smoke test passes
```

### Slice 2

```text
test DB
→ deterministic seed
→ DB-backed page test
```

### Slice 3

```text
auth fixture
→ real login smoke
→ protected-flow test
```

### Slice 4

```text
one CRUD business flow
```

После каждого slice:

```text
run narrow test
→ inspect failure
→ fix
→ rerun
→ git diff
```

Не писать 30 тестов до первого запуска.

---

## 34. Token/context optimization

Агент обязан соблюдать проектный contract экономии контекста.

Правила:

- Graphify → `rg` → targeted read → full file only if necessary.
- Не читать весь `docs/spec/*`.
- Не читать весь repository.
- Не перечитывать неизменившиеся файлы без необходимости.
- После правок использовать `git diff`.
- Выполнять самый узкий тест первым.
- Не загружать все skill files.
- Использовать только skill, релевантный текущему vertical slice.
- Корректность важнее экономии токенов, если дополнительный контекст действительно нужен.

---

## 35. Change scope

Допустимые изменения:

- Playwright dependency/config;
- E2E directory;
- test fixtures/helpers;
- минимальные `data-testid`;
- test env;
- test seed/factory support;
- package scripts;
- минимальные Docker/CI изменения;
- E2E documentation.

Не делать без отдельной необходимости:

- рефакторинг production architecture;
- массовый cleanup;
- изменение бизнес-логики;
- переименование domain entities;
- обновление unrelated dependencies;
- смену test framework для существующих unit tests.

---

## 36. Definition of Done — Infrastructure

E2E infrastructure готова, когда:

- [ ] E2E framework установлен и задокументирован.
- [ ] `npm run e2e` или эквивалент запускает suite.
- [ ] Есть изолированная test DB strategy.
- [ ] Схема БД подготавливается автоматически.
- [ ] Есть deterministic test data.
- [ ] Frontend/backend readiness проверяются без arbitrary sleep.
- [ ] Первый browser smoke test проходит.
- [ ] Login smoke test проходит.
- [ ] Protected route test проходит.
- [ ] При failure доступен trace/screenshot.
- [ ] Production credentials не используются.

---

## 37. Definition of Done — First business slice

Первый модуль считается покрытым, когда:

- [ ] list page загружает данные из test DB;
- [ ] create flow работает через UI;
- [ ] данные подтверждаются после reload;
- [ ] edit flow работает;
- [ ] persisted update подтвержден;
- [ ] тесты не зависят от порядка;
- [ ] повторный локальный запуск проходит;
- [ ] CI execution проходит либо подготовлен минимальный CI patch;
- [ ] нет arbitrary waits;
- [ ] нет brittle CSS selectors.

---

## 38. Verification order

После каждой реализации:

```text
1. targeted E2E test
2. relevant E2E folder
3. smoke suite
4. existing relevant unit/integration checks
5. lint/typecheck
6. project CI command, если это соответствует текущему workflow
```

Не запускать тяжелую full suite после каждой мелкой правки.

---

## 39. Expected agent report

В конце агент должен сообщить:

### Discovered

```text
Existing test stack
Current DB/seed strategy
Current auth strategy
Current Docker startup
Current CI pipeline
```

### Implemented

```text
Files added
Files changed
Scripts added
Test environment strategy
Initial scenarios
```

### Verification

Точные команды и результат.

### Remaining work

Только реальные следующие шаги, например:

```text
- expand coverage to subscriptions
- add role-specific scenario
- enable WebKit when needed
```

---

## 40. Acceptance criterion

Главный критерий:

> Из чистого подготовленного E2E environment разработчик или CI может запустить одну команду и получить воспроизводимую проверку реального пользовательского потока через React, Express, Prisma и test MySQL.

Первый milestone должен доказать архитектуру тестов на одном полном vertical slice.

После этого покрытие расширяется **один модуль за раз**.
