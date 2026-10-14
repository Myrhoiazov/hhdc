# План: приведение `client/` к Feature-Sliced Design

Статус на 2026-10-14: этапы 1–3 и задача 4.0 слиты (PR #13–#17). Задача 4.1, часть 1 (страницы настроек) — в ветке
`refactor/client-settings-pages`.

## Состояние после этапов 1–3

Замеры на ветке `refactor/client-entities-core` (PR #16).

| Показатель | Было | Сейчас | Цель | Закрывает этап |
|---|---|---|---|---|
| Импорты вверх по слоям, продакшен-код | 18 | 0 | 0 | 1 — готово |
| Импорты в обход публичного API | 3 | 0 (кроме объявленных `@x`) | 0 | 1 — готово |
| Правила слоёв в ESLint | только `path-checker` | слои + публичный API + `@x` + `path-checker` | — | 1 — готово |
| Объявлений `Field` | 3 | 1 | 1 | 2 — готово |
| Проверок прав строкой | 25 | 0 | 0 | 2 — готово |
| Вызовов `toLocale*String` в страницах | 36 | 0 | 0 | 2 — готово |
| Мёртвых символов из списка | 10 | 0 | 0 | 2 — готово |
| Слайсов сущностей | 2 (`User`, `crm`) | 25 | по одной на доменную сущность | 3 — готово |
| `export *` в `index.ts` сущностей | 7 | 0 | 0 | 3 — готово |
| Импортов `@/entities/crm` | 93 | 0, слайс удалён | 0 | 3 — готово |
| Тестов Jest | 431 | 476 | не меньше, чем до PR | каждый PR |
| Файлов в `pages/CrmPage` | 117 | 117 | 0, слайс удалён | 4 |
| Файлов, зависящих от `CrmPage.module.scss` | 51 | 50 | 0 | 4 |
| Файлов, зависящих от `CrmPage/ui/common.tsx` | 51 | 19 (только `CrmLayout`) | 0 | 4 |
| Слайсов `widgets` / `features` для CRM | 0 / 2 | 0 / 2 | по блоку и по действию | 4 |
| Страниц с ленивой загрузкой | 1 из 20 | 1 из 20 | все, кроме входа | 4 |
| Файлов длиннее 150 строк в `pages` | 6 | 6 | 0 | 4 |
| Файлов с ручным разбором `new FormData` | 26 | 27 | разбор — в `model` слайса, с тестом | 4 |
| Строк длиннее 160 символов | 240 | 200, из них 193 в `pages` | 0 | 4–5 |
| Строк длиннее 100 символов | 1468 | 1195 | 0 (`prettier/prettier` — ошибка) | 5 |

Что осталось вне таблицы:

- **Browser QA руками не проводился ни в одном этапе**: Docker локально не запускался. Этапы 1–3 не меняли разметку
  и стили по существу, E2E в CI проходил в каждом PR. Для этапа 4 ручная проверка обязательна — см. условия ниже.
- **`storybook:build` локально не завершается** (индексацию проходит, сборка зависает). В CI Storybook не собирается.
  Разбирается отдельной задачей 4.0.
- **`skylos-check`**: `SKY-Q804` срабатывал на `index.ts` каждого нового слайса (публичный API зависит от своего файла
  запросов). В PR #16 правило добавлено в `ignore` в `pyproject.toml` с объяснением; родственные `SKY-Q802`/`Q803`
  остаются информационными.

## Цель

`client/src` действительно следует `app → pages → widgets → features → entities → shared`: слой импортирует
только вниз и только через публичный API слайса, CRM разложен по доменным слайсам, бизнес-логика лежит в `model`/`lib`
отдельно от разметки, общие блоки переиспользуются из `shared`. Поведение приложения не меняется — это рефакторинг.

## Анализ: что есть сейчас

Замеры от 2026-10-13 на `develop` (`518072e`). Это базовая линия, с ней сравнивается приёмка.

| Показатель | Сейчас | Как измерено |
|---|---|---|
| Импорты вверх по слоям, продакшен-код | 18 | скан импортов `client/src` |
| Импорты вверх по слоям, тесты и сторис | 24 | то же |
| Импорты в обход публичного API слайса | 3 | то же |
| Импорты вбок между слайсами одного слоя | 0 | то же |
| Файлов в слайсе `pages/CrmPage` | 117, из них 76 в плоской `ui/` | `find` |
| Страниц, экспортируемых одним слайсом | 19 | `pages/CrmPage/index.ts` |
| Доменных сущностей CRM | 1 (`entities/crm`, семь `export *`) | `entities/crm/index.ts` |
| Слайсов `widgets` / `features` для CRM | 0 / 2 (`composeEmail`, `createPerson`) | `ls` |
| Файлов, зависящих от `CrmPage/ui/common.tsx` | 51 | `rg` |
| Файлов, зависящих от `CrmPage.module.scss` | 51 | `rg` |
| Строк длиннее 100 символов (`printWidth`) | 1468 из 11 843 | `awk` |
| Строк длиннее 160 символов | 240, из них 191 в `pages` | `awk` |
| Страниц с ленивой загрузкой | 1 из 20 (`LoginPage`) | `rg "lazy\("` |
| Объявлений компонента `Field` | 3 | `rg` |
| Файлов с ручным разбором `new FormData` | 26 | `rg` |
| Файлов с `toLocale*String` без общего форматтера | 28 | `rg` |
| Проверок прав строкой `permissions.includes('…')` | 25 | `rg` |
| ESLint | 0 ошибок, 16 предупреждений | `npm run lint:ts` |
| Skylos: функции > 50 строк / сложность > 10 / > 5 параметров | 0 в продакшен-коде, 7 `describe` в тестах | `skylos client/src --quality` |

### Причины

1. **Типы стора живут в `app`.** `StateSchema`, `ThunkConfig`, `AppDispatch`, `StoreType`, `ReduxStoreWithManager` нужны
   `shared`, `entities`, `features` и `widgets`, поэтому все они импортируют `@/app/providers/StoreProvider`.
   `shared/api/api.ts` дополнительно знает о `entities/User`, чтобы разлогинить по ответу 401.
2. **Линтер проверяет только одно правило.** В `client/eslint.config.mjs` включён `path-checker` (относительные пути
   внутри слайса). Направление слоёв и публичный API не проверяются.
3. **CRM писался в один слайс.** Изоляция слайсов внутри `pages/CrmPage` ничего не ограничивает, поэтому общие
   компоненты, доменная логика и страницы разных доменов ссылаются друг на друга напрямую.
4. **Prettier не включён как правило.** Плагин подключён, `prettier/prettier` — нет. Лимит в 50 строк на функцию
   выполняется за счёт строк по 200–300 символов.

### Мёртвый код (использований в `client/src` нет)

`getRouteSettings`, `getRouteProfile`, `getRouteClientDetails`, `getRouteMollieDetails` (`shared/const/router.ts`),
`addQueryParams`, `useRefreshToken`, `CLIENT_CREATED_EVENT`, `EMAIL_MESSAGES_UPDATED_EVENT`,
`ARTICLES_VIEW_LOCALSTORAGE_KEY`, `CLIENT_VIEW_LOCALSTORAGE_KEY`. Перед удалением каждый символ проверяется `rg` по
всему репозиторию, включая `e2e/` и `telegram-mini-app/`.

## Решения по устройству

- **Контракт стора — в `shared/lib/store`.** Там объявляется пустой интерфейс `StateSchema`, а также `ThunkConfig`,
  `ThunkExtraArg`, `AppDispatch`, `ReducerManager`, `ReduxStoreWithManager`. Каждый слайс, у которого есть редьюсер,
  дополняет `StateSchema` своим полем через `declare module` рядом со своими типами. `app` только собирает стор.
- **`shared/api` не знает о сторе и пользователе.** Вместо `injectStore` — `setUnauthorizedHandler(handler)`; `app`
  передаёт туда `() => store.dispatch(userActions.logout())`.
- **Границы проверяет ESLint без новых зависимостей**: встроенное `no-restricted-imports` с набором запретов на каждый
  слой и запретом глубоких импортов `@/<слой>/<слайс>/**`. Тестам и сторис разрешено импортировать `@/app/providers/*`
  для обёрток рендера; публичный API обязателен и для них.
- **Доменные слайсы называются терминами `CONTEXT.md` и `AGENTS.md`**: `person`, `event`, `registration`,
  `eventExpense`, `eventTeam`, `choreographer`, `communication`, `knowledge`, `provider`, `finance`, `audit`, `user`.
- **Раскладка блока страницы**: чтение и показ данных сущности — `entities/<x>/ui`; действие пользователя (добавить,
  изменить, удалить) — `features/<verbNoun>`; составной блок страницы из нескольких сущностей и фич —
  `widgets/<x>`; страница только собирает виджеты и читает параметры маршрута.
- **Чистая логика — в `model`/`lib` сегмента и тестируется напрямую**: переходы статусов, разбор форм, сборка
  параметров запроса.

## Этапы

Каждый этап — отдельная ветка и PR в `develop`. После каждой задачи приложение собирается и проверки зелёные.

### Этап 1. Границы слоёв под защитой линтера

Ветка `refactor/client-fsd-boundaries`.

## Task 1.1: Контракт стора в `shared`

**Description:** Типы стора переезжают в `shared/lib/store`, слайсы дополняют `StateSchema` своими полями.

**Acceptance criteria:**
- [ ] В `shared`, `entities`, `features`, `widgets` нет импортов `@/app/**` в продакшен-коде.
- [ ] `app/providers/StoreProvider` реэкспортирует типы из `shared/lib/store`, а не объявляет их.
- [ ] `StateSchema` содержит `user`, `ui`, `loginForm?` — проверяется `tsc`.

**Verification:**
- [ ] Client: `npm run typecheck`, `npm run lint:ts`, `npm test`

**Dependencies:** None

**Files likely touched:**
- `client/src/shared/lib/store/*` (новый)
- `client/src/app/providers/StoreProvider/**`
- `client/src/entities/User/model/**`, `client/src/features/Auth/model/**`, `client/src/features/UI/model/**`
- `client/src/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader.tsx`
- `client/src/shared/lib/hooks/useAppDispatch/useAppDispatch.ts`
- `client/src/widgets/Page/Page.tsx`

**Estimated scope:** M

## Task 1.2: `shared/api` без стора и `entities/User`

**Description:** Реакция на 401 передаётся в `shared/api` обработчиком из `app`.

**Acceptance criteria:**
- [ ] `shared/api/api.ts` не импортирует ни `app`, ни `entities`.
- [ ] Ответ 401 по-прежнему сбрасывает CSRF-токен и разлогинивает — покрыто тестом.

**Verification:**
- [ ] Client: `npm run typecheck`, `npm test`
- [ ] Browser QA: вход, истечение сессии → возврат на страницу входа

**Dependencies:** 1.1

**Files likely touched:**
- `client/src/shared/api/api.ts`, `client/src/app/providers/StoreProvider/config/store.ts`

**Estimated scope:** S

## Task 1.3: Публичный API и сторис

**Description:** Три глубоких импорта заменяются импортом из `index.ts`; сторис в `shared` и `widgets` перестают
импортировать `ThemeProvider` из `app` (тема приходит декоратором Storybook).

**Acceptance criteria:**
- [ ] Нет импортов вида `@/<entities|features|widgets|pages>/<слайс>/<что-то ещё>` вне самого слайса.
- [ ] `shared/config/storybook/StyleDecorator` не импортирует `@/app/styles`.

**Verification:**
- [ ] Client: `npm run lint:ts`, `npm test`, `npm run storybook:build`

**Dependencies:** 1.1

**Estimated scope:** S

## Task 1.4: Правила слоёв в ESLint

**Description:** `no-restricted-imports` запрещает импорт вверх, вбок и в обход публичного API.

**Acceptance criteria:**
- [ ] `npm run lint:ts` — 0 ошибок.
- [ ] Пробный импорт `@/app/...` из `shared` и `@/entities/User/model/...` из `features` даёт ошибку линтера
      (проверяется вручную и откатывается).
- [ ] Правила описаны в `.claude/rules/code-style.md`.

**Verification:**
- [ ] Client: `npm run lint:ts`; Root: `npm run ci`

**Dependencies:** 1.1, 1.2, 1.3

**Files likely touched:**
- `client/eslint.config.mjs`, `.claude/rules/code-style.md`

**Estimated scope:** S

### Этап 2. Общее — в `shared`, мёртвый код — прочь

Ветка `refactor/client-shared-kit`. Детальные задачи пишутся перед началом этапа.

- 2.1 `Field`, `RequestState`, `StatusBadge`, `Pager`, `ConfirmDelete` → `shared/ui`, по компоненту на папку, со своим
  SCSS-модулем на `-redesigned` токенах; три объявления `Field` сводятся к одному.
- 2.2 `useNumbers`, форматтер дат, `useDelayed`, `useListFilters`, чтение полей `FormData`, единое извлечение
  сообщения об ошибке для `useAction`/`useResource` → `shared/lib`, с прямыми тестами.
  Из разбора `FormData` в `shared` уходит только повторявшийся хелпер `formText`; разбор конкретных форм —
  доменная логика, она переезжает в `model` своих слайсов на этапе 4.
- 2.3 `hasPermission` и тип `Permission` → `entities/User`; 25 строковых проверок переходят на него.
- 2.4 Удаление мёртвого кода и пустых папок из списка выше. Заодно — две закомментированные сторис без экспорта по умолчанию
  (`LoginForm.stories.tsx`, `AvatarDropdown.stories.tsx`), из-за которых `storybook:build` падает уже на `develop`.

### Этап 3. `entities/crm` → доменные сущности

Слайсы называются в PascalCase, как существующий `entities/User`.

**Часть 1 (сделано, ветка `refactor/client-entities-admin`).** `Provider`, `Finance`, `Audit`, `Dashboard`, `Automation`,
`Assistant`, `Operations`, `Duplicate`, `DataExport`, `Campaign`, `Platform`, `Notification`, `Choreographer`, `Document`,
`Knowledge`, `Prompt`, `EmailSimulation`; запросы списка сотрудников — в `entities/User`.

**Часть 2 (сделано, ветка `refactor/client-entities-core`).** Сущности основных рабочих страниц: `Person`, `Event`,
`Registration`, `Order`, `EventExpense`, `EventTeam`, `Conversation`. `entities/crm` удалён.

Типы этих сущностей ссылаются друг на друга (`Event` → `Person`, `Conversation` → `Person` и `Event`). Сущность не
импортирует соседнюю через `index.ts`; связь объявлена явно файлом `@x`: `entities/Person/@x/event.ts` перечисляет
ровно то, что сущности `Event` можно знать о `Person`. Линтер пропускает `@/entities/<Slice>/@x/<consumer>` только
внутри слоя `entities`.

Правила для каждой сущности:

- Сегменты `api/` (запросы) и `model/` (типы, константы, чистая логика), при необходимости `ui/`. Большая сущность
  делит оба сегмента по частям (`Choreographer`: `mediaApi.ts` + `model/media.ts` и т. д.).
- `index.ts` перечисляет экспорты поимённо, без `export *`.
- Ответы сервера разворачивают `readData`, `readPage`, `postData`, `patchData`, `putData`, `deleteData` из
  `shared/api/request`.
- Новые файлы сущностей отформатированы Prettier.

### Этап 4. `pages/CrmPage` → страницы, виджеты, фичи

Этап меняет разметку и стили, поэтому идёт маленькими PR: один домен — одна ветка.

**Условия начала.** Запущен Docker (E2E-стенд и ручная проверка). PR #16 слит.

**Куда что уезжает.**

| Что сейчас в `pages/CrmPage` | Куда | Признак |
|---|---|---|
| Компонент маршрута (`EventPage`, `PeoplePage`, …) | `pages/<Name>Page` + `*.async.tsx` | читает параметры маршрута и права, собирает виджеты |
| Блок страницы из нескольких сущностей и действий (`EventExpenses`, `EventTeam`, `EmailWorkspace`) | `widgets/<Name>` | самостоятельная секция с заголовком |
| Действие пользователя с формой или подтверждением (добавить расход, удалить человека) | `features/<verbNoun>` | меняет данные |
| Показ одной сущности без действий (строка, карточка, бейдж статуса) | `entities/<Name>/ui` | только читает |
| Переходы статусов, разбор формы, сборка параметров | `model/` или `lib/` своего слайса | чистая функция с прямым тестом |
| Классы `panel`, `row`, `badge`, `actions`, `muted`, таблица и фильтры списка | компоненты `shared/ui` | используются в нескольких доменах |

**Где остаётся код страницы (уточнено в 4.1).** Блок или действие, которые нужны одной странице, остаются в слайсе
этой страницы: `pages/<Name>Page/ui/` — компонент на файл, `pages/<Name>Page/model/` — хуки и чистая логика.
В `widgets` и `features` уходит только то, что используется на двух страницах и больше (например, затраты события —
на странице события и на карточке человека). Так советует сама методология FSD («pages first»): преждевременный
виджет — это лишний публичный API без второго потребителя. Таблица «Куда что уезжает» выше описывает конечную точку
для переиспользуемого кода.

**Правила для каждого PR этапа.**

- Один компонент — один файл и свой SCSS-модуль; файл не длиннее 150 строк.
- Перенесённые файлы форматируются Prettier (`printWidth` 100); функции, вышедшие за 50 строк, декомпозируются.
- Тесты переезжают вместе с кодом; для вынесенной чистой логики пишется прямой тест до переноса.
- Текст интерфейса, ключи i18n, маршруты и запросы не меняются.
- Страница подключается в роутере через `*.async.tsx`.

## Task 4.0: Общий каркас CRM-страниц — сделано

**Что сделано.**

- `CrmLayout` живёт в слайсе `widgets/Page` рядом с `Page`: он оборачивает `Page`, а виджет не импортирует соседний
  виджет. `pages/CrmPage/ui/common.tsx` удалён.
- `Panel` и `Badge` — компоненты `shared/ui` с тестами; `StatusBadge` построен на `Badge`. 76 панелей и 21 бейдж
  в страницах переведены на них (панели и простые бейджи — AST-кодмодом, составные — вручную).
- Остальные общие классы (`stack`, `grid`, `row`, `wide`, `check`, `actions`, `muted`, `error`, `result`, `secret`)
  лежат в `shared/ui/layout/layout.module.scss`, стили списков — в `shared/ui/ListTable`. Это раскладка между
  компонентами, а не самостоятельные элементы интерфейса, поэтому они остались классами. Отступление от первой
  версии плана, где и они назывались компонентами.
- `pages/CrmPage/ui/CrmPage.module.scss` удалён: файлы страниц зависят только от `shared`, `entities`, `features` и
  `widgets`, и следующие задачи могут переносить их по одному.
- `storybook:build` проходит. Причина была не в зависании: десять сторис были целиком закомментированы (удалены),
  а в `config/storybook/main.ts` не было настроек сборки приложения — алиаса `@/`, SCSS-модулей, SVG-компонентов и
  констант `__IS_DEV__` / `__API__` / `__PROJECT__`.

**Как проверено.** 76 скриншотов (19 страниц × светлая и тёмная тема × 1280 и 390 px) сняты на `develop` и после
изменений на чистой E2E-базе с одинаковыми данными: совпадают попиксельно. Сверка поймала один дефект до коммита —
`AiSwitch` читал класс панели через другой алиас и остался без фона.

**Чего сверка не покрывает.** Состояния, которых нет в тестовых данных: карточка хореографа и её вкладки, бейджи
статусов заказов, результат симуляции письма, блоки результата на странице операций. Они проверяются руками в
задачах своих доменов.

**Открыто.** В старых компонентах `shared/ui` есть обращения к классам, которых нет в их SCSS-модулях
(`Textarea` → `readonly`, `Text` → `Text`, `Dropdown`, `ListBox`, `Popover` — корневые классы, `ListBox` →
`popupCls.selected`). Было до рефакторинга, на вид не влияет; чинится отдельно. TypeScript таких ошибок не видит,
поэтому в задачах 4.1–4.6 после каждого переноса запускается сверка скриншотов.

## Task 4.1: Финансы, провайдеры, аудит, настройки

**Description:** Реже используемые страницы. На них отрабатывается приём до основных страниц. Три PR:

- **4.1a — настройки (сделано, ветка `refactor/client-settings-pages`):** `UsersPage`, `PlatformPage`,
  `NotificationsPage`, `AuditPage`, `ProvidersPage`.
- **4.1b — финансы и дашборд:** `FinancePage`, `DashboardPage`.
- **4.1c — операционные:** `AutomationsPage`, `OperationsPage`, `AssistantPage`, `DuplicatesPage`, `CampaignsPage`.

**Acceptance criteria:**
- [ ] У каждой страницы свой слайс в `pages/` с ленивой загрузкой (`*.async.tsx`).
- [ ] Компонент на файл, файлы не длиннее 150 строк, отформатированы Prettier.
- [ ] Хуки и разбор форм — в `model/` слайса; разбор форм покрыт тестами.
- [ ] 76 скриншотов совпадают с эталоном попиксельно.

**Сделано в 4.1a.** Пять страниц — пять слайсов с ленивой загрузкой; 9 файлов разрезаны на 34. Разбор форм
пользователя, API-ключа и вебхука — в `model` с тестами; описания форм провайдеров отделены от сборки запроса
(`providerForms.ts` / `buildProviderInput.ts`). Правило «какая ИИ-модель пишет ответы» перенесено в
`entities/Provider` с тестом: это правило сущности, оно повторяет сервер. Скриншоты совпадают, Playwright проходит.

**Verification:**
- [ ] Client: проверки как в 4.0
- [ ] Сверка скриншотов; `notifications.spec.ts`, `ai-switch.spec.ts`

**Dependencies:** 4.0

**Estimated scope:** M × 3

## Task 4.2: Хореографы

**Description:** `ChoreographersPage`, `ChoreographerPage` и девять вкладок.

**Acceptance criteria:**
- [ ] Каждая вкладка — виджет; действия вкладок (добавить контакт, загрузить фото, записать выплату) — фичи.
- [ ] `groupByYear`, `payoutActions`, `movePhoto`, `photoProblem`, `dueAtEndOfDay`, `isOverdue` лежат в `model`
      и тестируются из своих файлов, а не через файлы разметки.
- [ ] `ChoreographerPages.test.tsx` разделён по вкладкам.

**Verification:**
- [ ] Client: проверки как в 4.0; Browser QA всех вкладок, обе темы

**Dependencies:** 4.0

**Estimated scope:** M × 2

## Task 4.3: База знаний

**Description:** `KnowledgePage`: документы, синхронизация, библиотека промптов, симуляция писем и её история.

**Acceptance criteria:**
- [ ] Пять панелей — виджеты; сохранение документа, активация промпта, запуск симуляции — фичи.

**Verification:**
- [ ] Client: проверки как в 4.0; Browser QA, обе темы

**Dependencies:** 4.0

**Estimated scope:** M

## Task 4.4: Events (основная страница)

**Description:** `EventsPage` (список) и `EventPage` с блоками продаж, типов билетов, участников, команды, затрат и
документов.

**Acceptance criteria:**
- [ ] Виджеты `EventExpenses`, `EventTeam`, `EventPeople`, `EventSalesPanel`, `EventTicketTypes`; фичи
      `addEventExpense`, `editEventExpense`, `addTeamMember`, `registerPerson`, `assignChoreographer`, `createEvent`.
- [ ] Переходы статусов затраты, кодирование получателя и разбор форм затрат и команды — в `model` с тестами.
- [ ] Ни один файл домена не длиннее 150 строк (сейчас `EventExpenses.tsx` — 250, `EventTeam.tsx` — 215).

**Verification:**
- [ ] Client: проверки как в 4.0
- [ ] Browser QA полного сценария: событие → участник → член команды с оплатой → затрата → смена статуса → удаление;
      обе темы, десктоп и 390px

**Dependencies:** 4.0; 4.1–4.3 слиты

**Estimated scope:** M × 2

## Task 4.5: People (основная страница)

**Description:** `PeoplePage` (список) и `PersonPage` с заказами, перепиской, затратами, ролями в командах и удалением.

**Acceptance criteria:**
- [ ] Виджеты `PersonOrders`, `PersonConversations`, `PersonExpenses`, `PersonTeamRoles`; фичи `editPerson`,
      `managePersonRoles`, `removePerson`.
- [ ] `model/peopleListUrl.ts` переезжает в слайс страницы списка вместе с тестом.

**Verification:**
- [ ] Client: проверки как в 4.0; `people.spec.ts`
- [ ] Browser QA: поиск и фильтры списка, пагинация с возвратом, карточка человека, удаление; обе темы

**Dependencies:** 4.4

**Estimated scope:** M × 2

## Task 4.6: Почта (основная страница)

**Description:** `CommunicationsPage` и папка `email/`: список, тред, ответ, массовые действия.

**Acceptance criteria:**
- [ ] Виджет `EmailWorkspace` собирает `InboxList`, `ConversationDetail`, `MailboxNavigation`; фичи
      `replyToConversation`, `bulkDisposition`, `generateDraft`.
- [ ] `model/mailState.ts`, `useConversationPages.ts`, `useConversationSelection.ts`, `activeAi.ts` — в `model`
      виджета; `CommunicationsPage.module.scss` (938 строк) разделён по компонентам.
- [ ] `pages/CrmPage` удалён.

**Verification:**
- [ ] Client: проверки как в 4.0; `email-bulk.spec.ts`, `mobile-lang-switcher.spec.ts`, `app.spec.ts`
- [ ] Browser QA: чтение, ответ с вложением, черновик ИИ, массовое удаление, мобильная раскладка; обе темы

**Dependencies:** 4.5

**Estimated scope:** M × 3

### Этап 5. Prettier как правило

- `prettier/prettier` включается для слайса в том же PR, где слайс переносится (этапы 2–4), чтобы не было одного
  гигантского диффа; в конце — для всего `client/src`.
- Функции, вышедшие за 50 строк после форматирования, декомпозируются, а не глушатся.

## План приёмки

### Для каждого PR

- [ ] `npm run ci` из корня — зелёный.
- [ ] `npm run check:skylos` — нет новых находок `SKY-Q301`, `SKY-C304`, `SKY-C303`.
- [ ] Число тестов Jest не меньше, чем до PR; ни один тест не удалён и не ослаблен ради переноса.
- [ ] Дифф не меняет текст интерфейса, маршруты, запросы к API и ключи i18n (кроме явно названных в задаче).
- [ ] Browser QA затронутых страниц: десктоп и мобильная ширина, светлая и тёмная тема, консоль без новых ошибок.
- [ ] Playwright-спеки затронутых страниц проходят.

### Итоговые цели

Цели и текущие значения — в таблице «Состояние после этапов 1–3» в начале документа.

Этап принят, когда его строки таблицы достигли цели и выполнен чек-лист PR.

## Риски

| Риск | Влияние | Что делаем |
|---|---|---|
| Дополнение `StateSchema` через `declare module` не подхватится сборкой или Jest | Средний | Проверяем `tsc`, Jest и `build:prod` в задаче 1.1; запасной вариант — интерфейс собирается в `shared/lib/store` из type-only импортов с точечным исключением в линтере |
| Сломать выход по 401 или CSRF | Высокий | Отдельная задача 1.2 с тестом на перехватчик и ручной проверкой сессии |
| Перенос файлов ломает тесты и Playwright-локаторы | Средний | Переносим без изменения разметки; тесты едут вместе с файлом |
| Общий `CrmPage.module.scss` при делении даст визуальные расхождения | Средний | Делим по одному владельцу за PR, сравниваем страницу до и после в обеих темах |
| Конфликты с параллельной продуктовой работой в `pages/CrmPage` | Высокий | Короткие ветки по одному домену; основные страницы (Events, People, Почта) переносятся последними и по одной |
| Этап 4 без ручной проверки в браузере | Высокий | Этап не начинается без запущенного Docker; каждая страница сверяется до и после в обеих темах |
| Форматирование Prettier раздует функции за 50 строк | Средний | Форматируем по слайсу вместе с декомпозицией, не одним коммитом на весь клиент |

## Открытые вопросы

- Нет. Порядок переноса определён: основные страницы (Почта, People, Events) — последними.
