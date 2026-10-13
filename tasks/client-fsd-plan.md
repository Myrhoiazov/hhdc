# План: приведение `client/` к Feature-Sliced Design

Статус: этапы 1–2 слиты (PR #13, #14). Этап 3: первая часть (админские сущности, хореографы, документы, база знаний) —
в ветке `refactor/client-entities-admin`; остались сущности основных страниц.
Дата: 2026-10-13.

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

**Часть 2 (осталось).** Сущности основных рабочих страниц (решение владельца от 2026-10-13: основные страницы — Почта,
People, Events): `EventExpense` + `EventTeam` → `Event` + `Registration` + `Order` → `Person` → `Communication`.
Их типы ссылаются друг на друга (`Event` → `Person`, `Conversation` → `Person` и `Event`), а сущность не импортирует
соседнюю сущность. Перед переносом решается, как это выразить: краткие собственные типы вложенных записей
(`EventPersonBrief`) или явные кросс-импорты `@x` с исключением в линтере.

Правила для каждой сущности:

- Сегменты `api/` (запросы) и `model/` (типы, константы, чистая логика), при необходимости `ui/`. Большая сущность
  делит оба сегмента по частям (`Choreographer`: `mediaApi.ts` + `model/media.ts` и т. д.).
- `index.ts` перечисляет экспорты поимённо, без `export *`.
- Ответы сервера разворачивают `readData`, `readPage`, `postData`, `patchData`, `putData`, `deleteData` из
  `shared/api/request`.
- Новые файлы сущностей отформатированы Prettier.
- `entities/crm` удаляется, когда на него не осталось импортов.

### Этап 4. `pages/CrmPage` → страницы, виджеты, фичи

По одной ветке на домен, в том же порядке: финансы, провайдеры, аудит, настройки → хореографы → база знаний →
Events → People → Почта. Основные страницы идут последними, когда приём уже отработан на остальных, и каждая
проходит полный Browser QA и свой Playwright-спек до слияния.

- Страница на маршрут: `pages/EventPage`, `pages/EventsPage`, `pages/PersonPage` и т. д., каждая с `*.async.tsx`.
- Блоки страницы → `widgets` (`EventExpenses`, `EventTeam`, `EventPeople`, `PersonOrders`, `EmailWorkspace`, …).
- Действия → `features` (`addEventExpense`, `editEventExpense`, `addTeamMember`, `removePerson`, …).
- Чистая логика из файлов разметки → `model`/`lib` с тестами.
- `CrmLayout` → `widgets/CrmLayout`; `CrmPage.module.scss` делится по владельцам стилей.
- `pages/CrmPage` удаляется.

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

| Показатель | Сейчас | Цель | После этапа |
|---|---|---|---|
| Импорты вверх по слоям, продакшен-код | 18 | 0 | 1 |
| Импорты в обход публичного API | 3 | 0 | 1 |
| Правила слоёв в ESLint | 1 | слои + публичный API + `path-checker` | 1 |
| Объявлений `Field` | 3 | 1 | 2 |
| Проверок прав строкой | 25 | 0 | 2 |
| Мёртвых символов из списка | 10 | 0 | 2 |
| `export *` в `index.ts` сущностей | 7 | 0 | 3 |
| Импортов `@/entities/crm` | все | 0, слайс удалён | 3 |
| Файлов в `pages/CrmPage` | 117 | 0, слайс удалён | 4 |
| Страниц с ленивой загрузкой | 1 из 20 | все, кроме входа в приложение | 4 |
| Файлов длиннее 150 строк в `pages` | 6 | 0 | 4 |
| Строк длиннее 100 символов | 1468 | 0 (`prettier/prettier` — ошибка) | 5 |

Этап принят, когда его строки таблицы достигли цели и выполнен чек-лист PR.

## Риски

| Риск | Влияние | Что делаем |
|---|---|---|
| Дополнение `StateSchema` через `declare module` не подхватится сборкой или Jest | Средний | Проверяем `tsc`, Jest и `build:prod` в задаче 1.1; запасной вариант — интерфейс собирается в `shared/lib/store` из type-only импортов с точечным исключением в линтере |
| Сломать выход по 401 или CSRF | Высокий | Отдельная задача 1.2 с тестом на перехватчик и ручной проверкой сессии |
| Перенос файлов ломает тесты и Playwright-локаторы | Средний | Переносим без изменения разметки; тесты едут вместе с файлом |
| Общий `CrmPage.module.scss` при делении даст визуальные расхождения | Средний | Делим по одному владельцу за PR, сравниваем страницу до и после в обеих темах |
| Конфликты с параллельной продуктовой работой в `pages/CrmPage` | Высокий | Короткие ветки по одному домену; перед этапом 4 сверяемся, какие домены сейчас в работе |
| Форматирование Prettier раздует функции за 50 строк | Средний | Форматируем по слайсу вместе с декомпозицией, не одним коммитом на весь клиент |

## Открытые вопросы

- Нет. Порядок переноса определён: основные страницы (Почта, People, Events) — последними.
