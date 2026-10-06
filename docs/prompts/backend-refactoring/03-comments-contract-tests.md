# Comments — API Contract Tests

## Source of Truth

Read:

- `AGENTS.md`
- `docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md`

Target:

`server/src/modules/comments/`

This task continues:

- Phase 1 — structural migration
- Phase 2 — API contract / Prisma projection

Do not repeat those refactors.

---

# Goal

Зафиксировать текущее поведение Comments минимальным набором серверных тестов.

Основная цель:

защитить API contract и Prisma projections, созданные в Phase 2, чтобы дальнейший рефакторинг не вернул случайно лишние поля или не сломал response shape.

Не стремиться к максимальному coverage.

Нужны только тесты с высокой архитектурной ценностью.

---

# Discovery

Перед написанием тестов:

1. Используй Graphify для определения зависимостей Comments.
2. Используй `rg` для поиска существующих test patterns в backend.
3. Найди наиболее близкие существующие service/controller tests.
4. Определи используемый test framework и mocking strategy.
5. Не читай все backend tests.
6. Используй только несколько наиболее релевантных существующих примеров.

Проверь:

- как mock'ается Prisma;
- как тестируются services;
- как тестируются Express controllers;
- какие helper/test utilities уже существуют.

Не создавай новую testing architecture, если существующая подходит.

---

# Test scope

Минимально покрыть следующие контракты.

## 1. GET comments with expanded user

Проверить, что service возвращает:

```ts
{
  id,
  text,
  createdAt,
  author: {
    id,
    firstName
  }
}