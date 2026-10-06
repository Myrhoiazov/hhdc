# Backend Modular Refactoring Specification

## 1. Цель

Постепенно реорганизовать существующий backend HHDC Admin из layer-first структуры:

server/src/
├── controllers/
├── services/
├── routes/
├── models/
├── helpers/
├── middlewares/
├── types/
└── ...

в модульную feature/domain-based архитектуру без изменения текущего поведения системы.

Основные цели:

1. Сгруппировать код по бизнес-модулям, а не по техническим слоям.
2. Уменьшить связанность между модулями.
3. Создать понятные границы модулей.
4. Подготовить архитектуру для DTO, API contracts и Prisma projections.
5. Исключить передачу лишних данных из Prisma в API.
6. Сделать backend проще для навигации человеком и AI-агентом.
7. Сохранить существующее поведение API.
8. Выполнять миграцию постепенно — один модуль за раз.
9. Минимизировать LLM-контекст и расход токенов во время рефакторинга.

---

# 2. Главный принцип

Рефакторинг НЕ является rewrite.

Запрещено одновременно реорганизовывать весь backend.

Работа выполняется вертикальными безопасными итерациями:

1 module
→ inspect
→ plan
→ move
→ fix imports
→ test
→ verify
→ commit-ready state

Только после завершения одного модуля разрешено переходить к следующему.

---

# 3. Текущее состояние

Существующая архитектура преимущественно layer-first:

server/src/
├── controllers/
│   ├── controller.Auth.ts
│   ├── controller.Users.ts
│   ├── controller.Invoices.ts
│   ├── controller.Payments.ts
│   └── ...
│
├── services/
│   ├── service.Auth.ts
│   ├── service.Users.ts
│   ├── service.InvoiceMollie.ts
│   ├── service.Payments.ts
│   └── ...
│
├── routes/
├── models/
├── helpers/
├── middlewares/
├── schemas/
├── types/
└── ...

Проблема:

код одной бизнес-фичи находится в нескольких разных директориях.

Например:

controllers/controller.Invoices.ts
services/service.InvoiceMollie.ts
services/service.InvoiceDelivery.ts
routes/...
types/...

Это затрудняет:

- поиск зависимостей;
- понимание бизнес-модуля;
- повторное использование;
- контроль API contracts;
- работу AI-агента;
- изменение функциональности;
- тестирование отдельных bounded contexts.

---

# 4. Целевая архитектура

Целевая high-level структура:

server/src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── companies/
│   ├── comments/
│   ├── certificates/
│   ├── schedule/
│   │
│   └── billing/
│       ├── invoices/
│       ├── payments/
│       ├── subscriptions/
│       └── shared/
│
├── integrations/
│   ├── mollie/
│   ├── email/
│   └── storage/
│
├── common/
│   ├── errors/
│   ├── middleware/
│   ├── validation/
│   ├── pagination/
│   ├── logger/
│   └── utils/
│
├── db/
│   └── prisma.ts
│
├── config/
├── app.ts
└── index.ts

Эта структура является направлением развития, а не требованием создать все директории заранее.

Не создавать пустые архитектурные слои "на будущее".

---

# 5. Feature-first organization

Код должен находиться максимально близко к бизнес-фиче, которой он принадлежит.

Пример:

modules/
└── comments/
    ├── comments.controller.ts
    ├── comments.service.ts
    ├── comments.routes.ts
    ├── comments.schema.ts
    └── comments.test.ts

Дополнительные файлы добавляются только при реальной необходимости:

comments.repository.ts
comments.dto.ts
comments.mapper.ts
comments.select.ts
comments.types.ts

Не создавать их автоматически для каждого модуля.

---

# 6. Правило одного модуля

За одну итерацию разрешено мигрировать только один модуль.

Например:

Comments

После полной проверки:

Certificates

Затем:

Schedule

и т.д.

Запрещено в рамках одной задачи одновременно переносить:

Users + Auth + Payments + Invoices.

---

# 7. Рекомендуемый порядок миграции

Начинать с наименее связанных модулей.

Предпочтительный порядок:

1. Comments
2. Certificates
3. Schedule
4. Companies
5. Users
6. Email / Communication
7. Invoices
8. Payments
9. Subscriptions
10. Auth

Порядок может быть изменён после анализа фактических зависимостей.

Auth, Billing и другие сильно связанные области не использовать как первый экспериментальный модуль.

---

# 8. Обязательная discovery-фаза

Перед изменением любого модуля агент обязан сначала определить его фактические границы.

Нельзя начинать с чтения десятков файлов.

Использовать поиск до чтения.

Порядок:

Graphify
→ rg
→ targeted file read
→ broader read only when necessary

---

# 9. Использование Graphify

Если Graphify доступен, сначала использовать его для определения:

- связанных файлов;
- импортов;
- экспортов;
- callers;
- callees;
- зависимостей;
- Prisma usage;
- routes;
- tests.

Graphify используется для понимания структуры.

Graphify не заменяет чтение конкретного кода, который будет изменяться.

---

# 10. Использование rg

`rg` является основным текстовым инструментом discovery.

Пример для Comments:

rg "Comments|Comment" server/src

Затем более узкие запросы:

rg "controller\.Comments" server/src
rg "service\.Comments" server/src
rg "from .*Comments" server/src
rg "prisma\..*comment" server/src
rg "comment" server/src/routes
rg "Comment" server/src/types server/src/schemas

Не запускать широкие поиски без необходимости.

---

# 11. Правила экономии контекста

Агент обязан минимизировать LLM context.

### Search before read

Если файл неизвестен:

Graphify
→ rg
→ targeted read

Не читать весь каталог `server/src`.

### Smallest useful range

Читать минимальный необходимый участок файла.

Не загружать файл полностью, если необходима одна функция.

### No repository dumps

Запрещено помещать в context:

- весь backend;
- все controllers;
- все services;
- все specs;
- все tests;
- весь Prisma schema,

если это не требуется конкретной задачей.

### Reuse context

Не перечитывать неизменённый файл в рамках одной задачи без причины.

После изменения предпочитать:

git diff

вместо повторного чтения полного файла.

---

# 12. Первая фаза рефакторинга — только структура

На первом проходе миграции модуля:

НЕ менять его бизнес-поведение.

Например:

controller.Comments.ts
service.Comments.ts

становятся:

modules/comments/comments.controller.ts
modules/comments/comments.service.ts

с исправлением импортов.

Не выполнять одновременно:

- архитектурный перенос;
- оптимизацию SQL;
- изменение API response;
- rename API fields;
- DTO migration;
- бизнес-рефакторинг;
- изменение validation;
- изменение endpoint URLs.

Structural refactor должен быть максимально механическим.

---

# 13. Поведение API должно сохраниться

После первой фазы:

HTTP methods должны остаться прежними.

Endpoint paths должны остаться прежними.

Request format должен остаться прежним.

Response format должен остаться прежним.

Status codes должны остаться прежними.

Error behavior должно остаться прежним.

---

# 14. Naming convention

При переносе разрешено постепенно нормализовать naming:

controller.Comments.ts

→

comments.controller.ts

service.Comments.ts

→

comments.service.ts

Но только для текущего мигрируемого модуля.

Запрещено массово переименовывать все backend-файлы отдельным mechanical commit без необходимости.

---

# 15. Module boundaries

Каждый модуль должен иметь чёткую границу.

Другие модули не должны зависеть от его внутренних implementation details.

Плохо:

import { findPayment } from
  "@/modules/billing/payments/payment.repository";

Предпочтительно:

import { getPayment } from
  "@/modules/billing/payments";

---

# 16. Public module API

При необходимости модуль может иметь:

index.ts

который определяет его публичный интерфейс.

Например:

payments/
├── payment.controller.ts
├── payment.service.ts
├── payment.repository.ts
├── payment.dto.ts
└── index.ts

index.ts:

export {
  createPayment,
  getPayment,
} from "./payment.service";

export type {
  PaymentDto,
} from "./payment.dto";

Другие модули импортируют только public API там, где это практически оправдано.

Не создавать `index.ts` только ради формальности.

---

# 17. Shared code classification

Перед переносом переиспользуемого кода определить его ownership.

Использовать следующий decision tree.

## Feature-specific

Если код нужен только одному модулю:

modules/<feature>/

Пример:

modules/invoices/invoice.calculator.ts

---

## Domain-shared

Если бизнес-логика используется несколькими модулями одного bounded context:

modules/<domain>/shared/

Пример:

modules/billing/
├── invoices/
├── payments/
├── subscriptions/
└── shared/
    ├── money.ts
    ├── billing.types.ts
    └── billing.errors.ts

---

## Application-wide common

Если код полностью domain-agnostic:

common/

Например:

- pagination;
- error base classes;
- generic validation helpers;
- generic middleware;
- generic date/string utilities.

---

## External integration

Если код работает с внешним сервисом:

integrations/

Например:

integrations/
├── mollie/
├── email/
└── storage/

---

# 18. Запрет на common dumping ground

`common/` и особенно `common/utils/` не должны становиться новой папкой для всего переиспользуемого кода.

Не помещать туда:

calculateInvoiceTotal
formatStudent
mollieStatus
sendInvoiceEmail

Это domain/business logic.

Допустимые generic utilities:

parseBoolean
clamp
pagination
date formatting
generic async helpers

---

# 19. Dependency direction

Предпочтительное направление зависимостей:

Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma

Service также может зависеть от:

- domain shared;
- common abstractions;
- integrations через interface/adapter.

Не допускать:

repository → controller

common → business module

integration → controller

low-level infrastructure → feature UI/API layer

---

# 20. Repository layer

Repository не является обязательным для каждого модуля.

Добавлять repository если:

- Prisma queries становятся значительными;
- несколько service methods повторяют query logic;
- persistence details мешают читать business logic;
- модуль имеет несколько сложных database operations;
- необходимо легче тестировать service без Prisma.

Простой модуль может оставаться:

controller
→ service
→ Prisma

до появления реальной необходимости.

---

# 21. DTO migration

DTO вводятся после структурной стабилизации конкретного модуля.

Не выполнять DTO migration одновременно с первым mechanical move, если это существенно увеличивает diff.

После успешного structural refactor:

Phase 2:

Prisma
→ projection
→ mapper
→ DTO
→ API

---

# 22. Prisma API rules

Prisma entities не должны автоматически становиться API responses.

Запрещён общий подход:

const data = await prisma.user.findMany();

return res.json(data);

если endpoint использует только часть данных.

Использовать Prisma:

select

для выбора необходимых полей.

---

# 23. Projection

Для API endpoint выбирать минимально необходимый набор данных.

Пример:

const users = await prisma.user.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    status: true,
  },
});

Не использовать unrestricted:

include: {
  ...
}

если весь relation object реально не нужен клиенту.

---

# 24. DTO per use case

Не создавать одну огромную модель:

UserDto

для всех API scenarios.

Предпочитать:

UserListDto
UserDetailsDto
UserOptionDto
CreateUserInput
UpdateUserInput

Одна Prisma entity может иметь несколько API representations.

Это ожидаемое поведение.

---

# 25. DTO ownership

DTO относится к API/use case, а не к Prisma.

Например:

Prisma User

не должен определять автоматически:

UserListDto.

Database model и API model являются разными концепциями.

---

# 26. Mapper

При необходимости использовать explicit mapper:

Prisma Projection
        ↓
      Mapper
        ↓
       DTO

Например:

function toUserListDto(user): UserListDto {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
  };
}

Не добавлять mapper, если response является прямой и очевидной projection без преобразования.

---

# 27. Schema validation

Существующие validation mechanisms не менять без отдельной причины.

Для новых или рефакторируемых API contracts предпочтительно использовать существующий schema mechanism проекта.

Если проект использует Zod:

Schema
→ runtime validation
→ inferred TypeScript types

Не добавлять вторую validation library.

---

# 28. External integrations

External SDK/API code должен быть изолирован от business modules насколько это оправдано.

Пример:

modules/billing/payments
        ↓
PaymentProvider
        ↓
integrations/mollie

Вместо использования Mollie SDK непосредственно во множестве business services.

---

# 29. Dependency inversion

Для внешних сервисов допускаются ports/adapters.

Например:

interface PaymentProvider {
  createPayment(...): Promise<...>;
}

Mollie implementation:

class MolliePaymentProvider implements PaymentProvider {
  ...
}

Этот подход применять только там, где abstraction действительно снижает coupling.

Не создавать interfaces вокруг каждого класса автоматически.

---

# 30. Tests colocated with module

При миграции существующих tests допускается постепенно переносить их рядом с модулем.

Например:

comments/
├── comments.service.ts
├── comments.service.test.ts
├── comments.controller.ts
└── comments.controller.test.ts

или существующий установленный проектом формат.

Не менять test organization массово в рамках первой миграции.

---

# 31. Tests before changes

Перед рефакторингом конкретного модуля определить его существующее test coverage.

Использовать:

rg "<ModuleName>" server/src --glob "*test*"

и package scripts.

Если тестов нет:

зафиксировать отсутствие тестов в плане.

Не выдумывать, что модуль покрыт тестами.

---

# 32. Verification strategy

После каждого meaningful change запускать narrowest useful check.

Порядок:

specific test
→ module/domain test suite
→ typecheck/lint
→ full CI

Не запускать полный CI после каждого rename, если существует быстрый релевантный тест.

---

# 33. Example verification

Для Comments:

1. comments.service.test.ts
2. comments.controller.test.ts
3. TypeScript check
4. relevant integration/API tests
5. npm run ci

Использовать реальные команды из package.json.

Не придумывать названия scripts.

---

# 34. Git diff verification

После переноса обязательно проверить:

git diff --stat
git diff

Проверить:

- случайно удалённый код;
- изменённое поведение;
- лишние formatting changes;
- unrelated modifications;
- неправильные imports;
- duplicate files.

---

# 35. No unrelated cleanup

Во время migration конкретного модуля запрещено исправлять случайно найденные unrelated проблемы.

Например, при переносе Comments обнаружена проблема Payments.

Не исправлять Payments в том же change set.

Записать как отдельную follow-up задачу.

---

# 36. Agent workflow

Для каждого модуля агент обязан работать следующим образом.

## Step 1 — classify

Определить:

- feature/domain;
- current files;
- routes;
- Prisma usage;
- dependencies;
- dependents;
- tests;
- shared code.

---

## Step 2 — discovery

Использовать:

Graphify
→ rg
→ targeted reads

Создать минимальную dependency map.

Пример:

Comments route
→ controller.Comments
→ service.Comments
→ Prisma.comment

Dependencies:

Auth middleware
Logger

Dependents:

comments routes only

---

## Step 3 — plan

Перед изменением кода сформировать короткий implementation plan.

Пример:

1. Create modules/comments.
2. Move service.
3. Move controller.
4. Move route if appropriate.
5. Fix imports.
6. Run Comments tests.
7. Run typecheck.
8. Inspect diff.

---

## Step 4 — structural move

Выполнить только mechanical migration.

Не менять public behavior.

---

## Step 5 — narrow verification

Запустить наиболее узкие tests/checks.

---

## Step 6 — diff review

Использовать git diff.

---

## Step 7 — broader verification

После narrow checks запустить более широкий CI только если предыдущие проверки успешны.

---

## Step 8 — report

В конце сообщить:

- какие файлы перенесены;
- какие imports изменены;
- какие tests запущены;
- результаты tests;
- изменилось ли API behavior;
- обнаруженные follow-up issues.

---

# 37. Task tracking

Во время миграции агент должен использовать native task tracking.

Минимальные состояния:

- discovery
- plan
- migration
- tests
- verification

Не создавать отдельный temporary markdown state file только для текущей AI-сессии.

Для информации, которая должна пережить сессию, использовать установленный persistent project-note mechanism.

---

# 38. Stop conditions

Агент должен остановить migration и запросить решение, если:

1. перенос требует изменения public API;
2. найдена циклическая зависимость;
3. неизвестно ownership shared logic;
4. existing tests показывают failure ещё до изменения;
5. изменение требует Prisma migration;
6. необходимо менять database schema;
7. найдено существенное behavioral coupling с другим модулем;
8. модуль невозможно безопасно отделить в рамках текущей задачи.

Не маскировать такие проблемы дополнительным refactoring.

---

# 39. Anti-patterns

Запрещено:

## Big Bang Refactor

Переносить весь server/src за один change set.

## Architecture for Architecture's Sake

Создавать:

repository
mapper
factory
adapter
provider
interface

для каждого модуля независимо от необходимости.

## Generic Shared Everything

Переносить любой duplicated code в common.

## Prisma Leakage

Возвращать Prisma models напрямую как публичный API contract.

## Deep Cross-module Imports

modules/A → modules/B/internal/repository

## Mixed Behavioral Refactor

Одновременно менять структуру и бизнес-поведение.

## Unbounded Reads

Читать весь repository для миграции одного controller.

## Full CI First

Начинать verification с самого дорогого тестового набора.

---

# 40. Definition of Done — module migration

Модуль считается структурно мигрированным, если:

- [ ] определены его реальные зависимости;
- [ ] все относящиеся к модулю файлы найдены;
- [ ] создана feature/domain directory;
- [ ] текущие файлы перенесены;
- [ ] imports исправлены;
- [ ] public routes не изменены;
- [ ] request contract не изменён;
- [ ] response contract не изменён;
- [ ] существующее business behavior не изменено;
- [ ] релевантные tests проходят;
- [ ] TypeScript checks проходят;
- [ ] git diff проверен;
- [ ] отсутствуют unrelated changes;
- [ ] старые duplicate files удалены;
- [ ] follow-up проблемы зафиксированы отдельно.

---

# 41. Definition of Done — API optimization phase

После структурной миграции модуль может пройти отдельную API optimization phase.

Она завершена если:

- [ ] определены реальные данные, необходимые каждому endpoint;
- [ ] Prisma queries используют минимальный `select`;
- [ ] unnecessary relations не загружаются;
- [ ] public DTO определён там, где он нужен;
- [ ] persistence model не используется как API contract;
- [ ] mapper добавлен только при необходимости;
- [ ] list endpoints имеют bounded result/pagination при необходимости;
- [ ] frontend contract совпадает с API;
- [ ] tests обновлены;
- [ ] payload не содержит ненужных внутренних полей.

---

# 42. Первая задача

Начать НЕ с глобального refactoring.

Выбрать один простой модуль.

Предпочтительный кандидат:

Comments

Перед изменением:

1. Использовать Graphify для поиска связей Comments.
2. Использовать `rg` для подтверждения всех references.
3. Найти:
   - controller;
   - service;
   - routes;
   - schemas;
   - types;
   - Prisma queries;
   - tests;
   - imports из других modules.
4. Составить dependency map.
5. Проверить baseline tests.
6. Предложить конкретный migration plan.
7. Только после этого начать перенос.

---

# 43. Первая итерация Comments

Ожидаемая структура после первой structural migration примерно:

server/src/modules/comments/
├── comments.controller.ts
├── comments.service.ts
└── comments.routes.ts

Дополнительные файлы переносить только если они реально относятся к Comments.

На первой итерации:

НЕ вводить DTO.

НЕ менять Prisma query.

НЕ оптимизировать API response.

НЕ менять endpoint.

НЕ менять validation behavior.

Цель первой итерации:

только доказать безопасный module migration workflow.

---

# 44. Вторая итерация Comments

После успешного structural migration провести отдельный анализ API.

Определить:

- какие fields реально используются frontend;
- какие fields возвращает backend;
- какие Prisma relations загружаются;
- какие данные лишние.

После этого предложить:

comments.select.ts
comments.dto.ts
comments.mapper.ts

только если они действительно нужны.

---

# 45. Главный архитектурный принцип

Код должен иметь очевидного владельца.

Если код относится к конкретной feature:

module owns it.

Если код относится к нескольким features одного domain:

domain/shared owns it.

Если код универсален:

common owns it.

Если код интегрируется с внешней системой:

integration owns it.

Избегать кода без понятного ownership.

---

# 46. Главный принцип API

Database model != API contract.

Prisma model описывает persistence.

DTO описывает данные, необходимые конкретному API use case.

Frontend должен получать только необходимые данные.

---

# 47. Главный принцип AI-разработки

Минимально необходимый контекст.

Search before read.

Smallest useful read.

One module at a time.

Narrowest test first.

git diff instead of rereading.

Correctness has priority over token savings when additional context is genuinely required.