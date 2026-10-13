# Todo: приведение `client/` к Feature-Sliced Design

План: [client-fsd-plan.md](client-fsd-plan.md).

## Этап 1. Границы слоёв под защитой линтера

- [x] Task 1.1: контракт стора в `shared/lib/store`
- [x] Task 1.2: `shared/api` без стора и `entities/User`
- [x] Task 1.3: публичный API и сторис
- [x] Task 1.4: правила слоёв в ESLint
- [x] Проверки клиента пройдены 2026-10-13: `typecheck`, `lint:ts` (0 ошибок), Jest 435/435, `build:prod`,
      `check:skylos`. Серверная часть `npm run ci` не запускалась — сервер не менялся.
- [x] E2E в CI прошёл; ручной Browser QA выхода по 401 не выполнялся (покрыто юнит-тестом)
- [x] PR #13 слит в `develop`

## Этап 2. Общее — в `shared`, мёртвый код — прочь

- [x] 2.1: `Field`, `RequestState`, `StatusBadge`, `Pager`, `ConfirmDelete` в `shared/ui`
- [x] 2.2: `useNumbers`, форматтеры дат, `useDelayed`, `useListFilters`, `formText`, `messageOf` в `shared/lib`
- [x] 2.3: `Permission`, `hasPermission`, `useCan` в `entities/User`
- [x] 2.4: удаление мёртвого кода и двух пустых сторис
- [x] PR #14 слит в `develop`

## Этап 3. `entities/crm` → доменные сущности

- [x] `Provider`, `Finance`, `Audit`, `Dashboard`, `Automation`, `Assistant`, `Operations`, `Duplicate`, `DataExport`,
      `Campaign`, `Platform`, `Notification`, запросы сотрудников в `User`
- [x] `Choreographer`, `Document`
- [x] `Knowledge`, `Prompt`, `EmailSimulation`
- [x] PR #15 (часть 1) слит в `develop`
- [x] Ссылки между сущностями — через `@x`, с исключением в линтере только для слоя `entities`
- [x] `EventExpense`, `EventTeam`
- [x] `Event`, `Registration`, `Order`
- [x] `Person`
- [x] `Conversation`
- [x] `entities/crm` удалён
- [ ] PR #16 (часть 2) открыт, ждёт слияния

## Этап 4. `pages/CrmPage` → страницы, виджеты, фичи

Условие начала: запущен Docker, PR #16 слит.

- [ ] 4.0: общий каркас — `widgets/CrmLayout`, общие стили в `shared/ui`, починка `storybook:build`
- [ ] 4.1: финансы, провайдеры, аудит, настройки, дашборд
- [ ] 4.2: хореографы
- [ ] 4.3: база знаний
- [ ] 4.4: Events
- [ ] 4.5: People
- [ ] 4.6: Почта; `pages/CrmPage` удалён

## Этап 5. Prettier как правило

- [ ] `prettier/prettier` включён для всего `client/src`
