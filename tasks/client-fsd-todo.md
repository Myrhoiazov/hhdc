# Todo: приведение `client/` к Feature-Sliced Design

План: [client-fsd-plan.md](client-fsd-plan.md).

## Этап 1. Границы слоёв под защитой линтера

- [x] Task 1.1: контракт стора в `shared/lib/store`
- [x] Task 1.2: `shared/api` без стора и `entities/User`
- [x] Task 1.3: публичный API и сторис
- [x] Task 1.4: правила слоёв в ESLint
- [x] Проверки клиента пройдены 2026-10-13: `typecheck`, `lint:ts` (0 ошибок), Jest 435/435, `build:prod`,
      `check:skylos`. Серверная часть `npm run ci` не запускалась — сервер не менялся.
- [ ] `storybook:build` падает и на `develop`: в `LoginForm.stories.tsx` и `AvatarDropdown.stories.tsx` нет
      экспорта по умолчанию (файлы закомментированы). Этим этапом не затронуто; чинится в этапе 2.4.
- [ ] Browser QA: вход и выход по истечении сессии — не выполнено, локально не запущен Docker (E2E-стенд)
- [ ] PR в `develop`

## Этап 2. Общее — в `shared`, мёртвый код — прочь

- [ ] 2.1: `Field`, `RequestState`, `StatusBadge`, `Pager`, `ConfirmDelete` в `shared/ui`
- [ ] 2.2: форматтеры, `useDelayed`, `useListFilters`, чтение `FormData`, сообщение об ошибке в `shared/lib`
- [ ] 2.3: `hasPermission` в `entities/User`
- [ ] 2.4: удаление мёртвого кода

## Этап 3. `entities/crm` → доменные сущности

- [ ] `provider`, `finance`, `audit`, `user`, `dashboard`
- [ ] `choreographer`
- [ ] `knowledge`
- [ ] `eventExpense`, `eventTeam`
- [ ] `event`, `registration`
- [ ] `person`
- [ ] `communication`
- [ ] `entities/crm` удалён

## Этап 4. `pages/CrmPage` → страницы, виджеты, фичи

- [ ] Финансы, провайдеры, аудит, настройки
- [ ] Хореографы
- [ ] База знаний
- [ ] Events
- [ ] People
- [ ] Почта
- [ ] `pages/CrmPage` удалён

## Этап 5. Prettier как правило

- [ ] `prettier/prettier` включён для всего `client/src`
