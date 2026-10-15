# FSD-архитектура клиента

Обязательный контракт для всех агентов и всего кода в `client/src`: каждая новая сущность, фича, виджет или
страница создаётся по Feature-Sliced Design, по правилам ниже. Порядок создания слайса и генератор — в навыке
[fsd-slice](../skills/fsd-slice/SKILL.md). Это единственный источник правды по слоям, слайсам и их
публичному API; форматирование и стили — в [code-style.md](code-style.md), форма функций — в
[architecture-quality-gate.md](architecture-quality-gate.md), предметные термины — в
[CONTEXT.md](../../CONTEXT.md).

## Слои и импорты

```text
app → pages → widgets → features → entities → shared
```

- Слой импортирует только слои ниже себя. Соседний слайс своего слоя — никогда.
- Чужой слайс импортируется только через его публичный API: `@/<layer>/<Slice>` (его `index.ts`). Внутри своего
  слайса — относительные пути.
- `shared` и `app` состоят из сегментов, а не из слайсов: `@/shared/ui/Panel`, `@/shared/lib/format/date`.
- Всё это проверяет линтер (`no-restricted-imports` в `client/eslint.config.mjs` и `path-checker`); нарушение —
  ошибка `npm run lint:ts`. Тестам, сторис и `*.testHelpers.tsx` дополнительно разрешён `@/app/providers/*` для
  обёрток рендера.

## Куда положить код

| Что это | Куда | Пример |
|---|---|---|
| Предметная запись: её типы, запросы, правила, показ без действий | `entities/<Name>` | `entities/EventExpense` |
| Правило предметной области (повторяет сервер) | `model/` сущности, с тестом | `nextExpenseActions`, `activeAiProvider`, `fullNameOf` |
| Действие пользователя, нужное нескольким страницам | `features/<verbNoun>` | `features/createPerson` |
| Самостоятельный блок, нужный нескольким страницам | `widgets/<Name>` | `widgets/ConversationThread`, `widgets/PersonExpenses` |
| Маршрут и всё, что нужно только ему | `pages/<Name>Page` | `pages/EventsPage` |
| Без предметного смысла: UI-кит, форматтеры, хуки, HTTP | `shared/<segment>` | `shared/ui/Pager`, `shared/api/request` |

**Pages first.** Блок или действие, которые нужны одной странице, остаются в слайсе этой страницы. В `widgets`
или `features` код переезжает, когда появляется вторая страница-потребитель. Правило предметной области уходит в
сущность сразу, даже если пока его читает одна страница.

## Анатомия слайсов

**Сущность** — `entities/<Name>`, имя в PascalCase и термином из `CONTEXT.md` (`Person`, `Registration`,
`EventTeam`):

```text
entities/<Name>/
  api/<name>Api.ts      запросы
  model/types.ts        типы и константы (большая сущность делит по частям: model/media.ts, api/mediaApi.ts)
  model/<rule>.ts       чистые правила + <rule>.test.ts
  ui/<Component>/       только показ, без действий (необязательно)
  @x/<consumer>.ts      типы для соседней сущности (только при связи, см. ниже)
  index.ts              публичный API: поимённые экспорты
```

**Страница** — `pages/<Name>Page`: `ui/` (компонент на файл; сама страница только собирает блоки), `model/` (хуки,
разбор форм, чистая логика с тестами), `ui/<Name>Page.async.tsx` (`lazy`), `index.ts` отдаёт ленивую версию.
Список и карточка одной записи — один слайс с двумя страницами (`pages/EventsPage`: `ui/list`, `ui/event`).

**Виджет и фича** — `ui/` и, при логике, `model/`; `index.ts` с поимённым экспортом.

## Связи между сущностями (`@x`)

Когда тип одной сущности содержит другую (`Event` → `Person`, `Conversation` → `Person` и `Event`), сосед
объявляет, что он отдаёт, файлом `entities/<Owner>/@x/<consumer>.ts`:

```ts
// entities/Person/@x/event.ts — что сущности Event можно знать о Person.
export type { Person } from '../model/types';
```

Потребитель импортирует `@/entities/Person/@x/event`. Линтер разрешает такой путь только внутри слоя `entities`.
Явный импорт важен и для корректности: без него `event?: Event` молча станет DOM-типом `Event`.

## Стор и HTTP

- Типы стора (`StateSchema`, `ThunkConfig`, `AppDispatch`, `ReduxStoreWithManager`) — `shared/lib/store/StateSchema.ts`;
  `app` только собирает стор.
- `shared/api` не знает о сторе и пользователе: реакцию на 401 приложение передаёт через
  `setUnauthorizedHandler` (см. `createReduxStore`).
- Необязательные редьюсеры подключаются через `<DynamicModuleLoader reducers={…}>` на странице или фиче-владельце.

## Тесты слайса

- Тест, который мокает сущность, сохраняет её настоящие правила и заменяет только запросы:
  `jest.mock('@/entities/<Name>', () => ({ ...jest.requireActual('@/entities/<Name>'), listX: jest.fn() }))`.
  Когда правило сущности само вызывает запрос, мокается её модуль запросов:
  `jest.mock('@/entities/<Name>/api/<name>Api', …)`.
- Общие моки и фикстуры нескольких тест-файлов — в `<Area>.testHelpers.tsx`; тест-файл импортирует его первым.
