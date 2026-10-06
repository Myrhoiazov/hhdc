# Comments — API Contract & Data Projection

## Source of Truth

Read first:

- `AGENTS.md`
- `docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md`

Target module:

- `server/src/modules/comments/`

## Goal

Провести вторую фазу рефакторинга модуля `Comments`:

- определить фактические API responses;
- определить, какие данные реально используются клиентом;
- убрать передачу лишних полей;
- использовать минимальные Prisma projections;
- ввести DTO только там, где они действительно нужны;
- сохранить текущее публичное поведение API, кроме осознанного удаления заведомо неиспользуемых внутренних полей после подтверждения их ненужности.

Не выполнять unrelated refactoring.

---

## Phase 1 — Discovery

Пока не изменяй код.

### 1. Найди public API модуля Comments

Используй:

Graphify
→ `rg`
→ targeted reads

Найди:

- routes;
- controller methods;
- service methods;
- Prisma queries;
- request schemas;
- response shapes;
- imports;
- consumers на frontend.

Не читай весь frontend.

Используй `rg` для поиска конкретных endpoint, route names, response fields и client calls.

---

## Phase 2 — Backend response inventory

Для каждого endpoint Comments составь таблицу:

| Endpoint | Prisma query | Current response | Relations | Potential extra fields |
| -------- | ------------ | ---------------- | --------- | ---------------------- |

Определи:

- какие поля выбираются из Prisma;
- какие поля реально возвращаются;
- есть ли `include`;
- возвращаются ли полные Prisma models;
- есть ли nested relations;
- какие внутренние поля потенциально не нужны API.

Пока ничего не меняй.

---

## Phase 3 — Frontend usage analysis

Для каждого Comments endpoint найди конкретные frontend consumers.

Определи:

- какие response fields реально читаются клиентом;
- какие используются для render;
- какие используются для conditions;
- какие используются для mutations/cache;
- какие нигде не используются.

Не делай вывод о ненужности поля только по backend.

Поле можно удалить из response только после поиска его consumers.

---

## Phase 4 — Contract proposal

На основании discovery предложи минимальный API contract для каждого endpoint.

Пример:

```ts
type CommentListItemDto = {
	id: number;
	text: string;
	createdAt: string;
	author: {
		id: number;
		name: string;
	};
};
```
