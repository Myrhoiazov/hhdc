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
- [x] PR #16 (часть 2) слит в `develop`

## Этап 4. `pages/CrmPage` → страницы, виджеты, фичи

- [x] 4.0: общий каркас — `CrmLayout` в `widgets/Page`, `Panel` и `Badge`, общие стили в `shared/ui`, `storybook:build`
      проходит; 76 скриншотов до и после совпадают попиксельно
- [x] PR #17 (4.0) слит в `develop`
- [x] 4.1a: настройки — `UsersPage`, `PlatformPage`, `NotificationsPage`, `AuditPage`, `ProvidersPage`
- [x] PR #18 (4.1a) слит в `develop`
- [x] 4.1b: финансы и дашборд; графики в `shared/ui/Chart`, правила возвратов в `entities/Finance`
- [x] PR #19 (4.1b) слит в `develop`
- [x] 4.1c: автоматизации, операции, ассистент, дубликаты, рассылки
- [x] PR #20 (4.1c) слит в `develop`
- [x] 4.2: хореографы — слайс страниц, виджеты `EventDocuments` и `PersonExpenses`, правила в сущностях
- [ ] 4.2: разделить `ChoreographerPages.test.tsx` по вкладкам
- [x] PR #21 (4.2) слит в `develop`
- [x] 4.3: база знаний
- [x] PR #22 (4.3) слит в `develop`
- [x] 4.4: Events — слайс страниц, правила затрат в сущности, сценарий пройден в браузере
- [x] PR #23 (4.4) слит в `develop`
- [x] 4.5: People — слайс страниц, виджет `ConversationThread`, `MailBadge`, правила имени и заказа в сущностях
- [x] PR #24 (4.5) слит в `develop`
- [x] 4.6: Почта; `pages/CrmPage` удалён
- [ ] PR 4.6 в `develop`

## Этап 5. Prettier как правило

- [ ] `prettier/prettier` включён для всего `client/src`
