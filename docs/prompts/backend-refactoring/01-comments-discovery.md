## Agent Prompt — Phase 1: Comments discovery & planning

Use the repository specification:

`docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md`

### Task

Прочитай `docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md` и выполни только discovery + planning для первого модуля `Comments`.

Пока не изменяй код.

### Requirements

1. Сначала используй Graphify.
2. Затем `rg` для поиска и подтверждения references.
3. Не сканируй и не читай весь backend.
4. Читай только найденные релевантные файлы и минимальные диапазоны.
5. Найди:
   - controller
   - service
   - routes
   - schemas/types
   - Prisma usage
   - tests
   - imports
   - dependents
6. Определи shared/reusable code и его ownership.
7. Проверь доступные `package.json` scripts и определи baseline test commands.
8. Составь dependency map.
9. Дай пошаговый migration plan без изменения поведения.
10. Не начинай implementation, пока discovery и planning не завершены.

### Scope

Цель первой итерации — только безопасный structural refactor `Comments`.

Не выполнять сейчас:

- DTO migration
- Prisma select optimization
- API response optimization
- API contract changes
- behavioral changes

### Expected Output

Агент должен вернуть:

1. список найденных файлов;
2. dependency map;
3. shared/reusable dependencies;
4. baseline test commands;
5. риски;
6. migration plan;
7. подтверждение, что код пока не изменялся.