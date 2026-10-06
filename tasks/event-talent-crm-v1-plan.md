# План миграции HHDC → Event & Talent CRM V1

## Цель и статус

Перестроить существующий проект по `docs/spec/event-talent-crm-v1-spec.md`, сохранив пригодные реализации email, AI/RAG, dashboard, авторизации и общих UI-компонентов. Итоговая система имеет единую модель Person/Event и не содержит действующих школьных модулей или параллельной legacy CRM.

Статус: реализация начата. Пользователь выбрал новую пустую PostgreSQL-базу, без переноса существующих данных. Существующая MySQL-база и её volumes сохраняются. План и чеклист вынесены в отдельные файлы, поскольку `tasks/plan.md` и `tasks/todo.md` уже изменены пользователем.

## Проверенные исходные условия

- React 19, FSD, Redux Toolkit, SCSS Modules; Express 5, Prisma 6, MySQL.
- Prisma использует `server/prisma/schema/`; Client связан с email, comments, invoices, Mollie и группами.
- API собирается в `server/src/routes/index.ts`; подключены schedule, invoices, transactions, Mollie, Telegram, Instagram, email, AI и knowledge.
- AI CRM reader обращается к `prisma.client`; простое удаление Client ломает сохранённый AI.
- UI содержит StudentsPage, DanceSchoolPage, BranchesPage, DanceStylesPage, SchedulePage и финансовые страницы.
- Текущие Users имеют ADMIN/MANAGER/DOCTOR и integer ID; это требуется заменить согласованно с middleware, сессиями и UI.
- Docker и E2E настроены на MySQL; смена одной строки datasource не является миграцией.
- Существующее запрещение choreographer в CONTEXT.md устарело относительно запроса: CHOREOGRAPHER становится ролью Person и назначением на Event по новой спецификации.

## Правила выполнения

1. Работать в task branch; исходные пользовательские изменения сохранить и не включать в свои коммиты.
2. Сначала подготовить целевой контракт, затем переносить вертикальные сценарии; каждый сценарий заканчивается проверками и удалением заменённого кода.
3. Временное сосуществование допускается только внутри миграции. Завершённая V1 не использует legacy endpoints, модели, страницы или фоновые процессы.
4. Сохранять полезные возможности email, AI и dashboard, переносить их на новый домен; не сохранять старые зависимости ради совместимости.
5. Не сбрасывать существующие базы и volumes. Переключение данных выполнять только после согласования политики переноса, backup и проверенного восстановления.
6. Не отправлять реальные письма и не выполнять изменения во внешних аккаунтах во время тестов. Использовать mocks и изолированные тестовые данные.
7. Для каждого изменяемого файла соблюдать architecture-quality-gate: функции до 50 строк, сложность до 10, максимум 5 параметров.
8. Production deployment остаётся отдельным действием владельца.

## Судьба существующих возможностей

| Область | Решение |
|---|---|
| Email/IMAP/SMTP | Сохранить полезную инфраструктуру, перенести на Conversation/Message и адаптер EmailProvider; добавить Gmail. Окончательная поддержка IMAP/SMTP требует ADR, если остаётся дополнительным провайдером V1. |
| AI/OpenAI/Ollama, prompts, simulation | Сохранить пригодную реализацию, заменить CRM context, классификацию и lifecycle drafts. Удалить школьные prompts и зависимости от Telegram approval. |
| Knowledge/RAG | Сохранить ingestion/chunking и пригодные retrieval-компоненты, перенести storage на PostgreSQL/pgvector; GLOBAL/EVENT scope. |
| Dashboard | Сохранить пригодные UI-компоненты, заменить KPI и запросы на события, участников, tickets, inbox и provider health. |
| Auth/users/security | Адаптировать к UUID, сессиям и OWNER/ADMIN/EVENT_MANAGER/SUPPORT/VIEWER; сохранить пригодную криптографию, CSRF и rate limiting. |
| Clients/comments | Заменить Person, roles, tags, notes и Activity; удалить Client после переноса всех потребителей. |
| School schedule/groups/branches/styles/students | Удалить; event schedule реализовать отдельным контрактом, не переименованием школьного расписания. |
| Старые ChoreographersPage | Заменить на Person CHOREOGRAPHER + EventChoreographer, проверить отсутствие школьных зависимостей. |
| Mollie/invoices/payment-reminders/transactions | Удалить из V1 runtime; финансы билетов хранить в Order/OrderItem/Ticket. История данных зависит от решения о переносе. Mollie — расширение V2. |
| Telegram/Instagram/admin bot/miniapp | Удалить из V1 вместе с маршрутами, workers, UI, схемами и тестовыми скриптами после отвязки auth/email/AI. |
| Settings/company/content | Сохранить только нужные организации, настройки и knowledge; удалить неподдерживаемые экраны и API после проверки потребителей. |

## Задачи

### 1. Зафиксировать целевую архитектуру и матрицу удаления

**Результат:** актуальный доменный контракт и полный список runtime-потребителей заменяемых модулей.

**Критерии:** семь ADR из §84; актуализированы CONTEXT/README/AGENTS без школьных ограничений для event choreographers; перечислены routes, cron, Prisma relations, FSD slices, переводы, seeds, tests и зависимости каждого удаляемого модуля; определён контракт event schedule (в спеках отсутствует его модель/API).

**Проверки:** diff-review, docs:links; поиск использования до каждого удаления.

**Зависимости:** нет. **Файлы:** docs/adr/, CONTEXT.md, README.md, AGENTS.md, server/src/routes/, client/src/shared/config/routeConfig/. **Объём:** S.

### 2. PostgreSQL и воспроизводимая схема

**Результат:** целевая PostgreSQL схема, применяемая на пустой изолированной базе миграциями.

**Критерии:** UUID, TIMESTAMPTZ, JSONB, Decimal для денег; core entities §§10–27, RBAC, Job/SyncRun; pgcrypto/pgvector; индексы и idempotency constraints; MySQL migrations не запускаются на PostgreSQL; Docker/dev/E2E/CI/backup tooling согласованы; тестовые seeds из §63. При переносе — явная карта old ID → UUID, отчёт сверки, dry run и восстановление backup.

**Проверки:** prisma validate/generate, migrate deploy на пустой тестовой базе, repository/transaction integration tests, backup/restore smoke check.

**Зависимости:** 1 и решение о данных. **Файлы:** server/prisma/, docker-compose*.yml, docker/, scripts/, .env.example, CI. **Объём:** несколько S/M подзадач по schema, инфраструктуре и переносу.

### 3. Вход, RBAC, Audit и providers foundation

**Результат:** владелец входит в CRM; права проверяются сервером на каждом защищённом endpoint.

**Критерии:** Argon2id, cookie sessions, CSRF, rate limits, disabled users; целевые роли/permissions; immutable AuditLog; безопасные DTO ProviderConnection без credentials; encrypted credentials; API /api/v1, requestId, единые ошибки и pagination.

**Проверки:** auth/permission negative tests, audit persistence, отсутствие секретов в ответах/логах, login E2E.

**Зависимости:** 2. **Файлы:** auth/users, providers/audit/shared, client auth/Role/settings. **Объём:** последовательные S/M срезы.

### 4. People, roles, tags и Activity

**Результат:** можно создать Person, назначить несколько ролей и увидеть историю.

**Критерии:** CRUD/pagination, нормализованный email без unique, роли уникальны внутри Person; безопасный matching без fuzzy merge; tags; Person 360° overview/notes/activity; операции и аудит атомарны где необходимо; Client/comments заменены после переноса потребителей.

**Проверки:** matching/shared-email/role tests, API integration, create/edit/assign-role E2E, desktop/mobile и темы.

**Зависимости:** 3. **Файлы:** modules/people/activity, entities/person, features/create-person/edit-person/assign-person-role, pages People. **Объём:** отдельные S/M срезы API, UI и cleanup.

### 5. Events, назначения и регистрации — первый milestone

**Результат:** login → dashboard shell → Person → role → Event → choreographer assignment → participant registration → Activity/Audit.

**Критерии:** timezone и статусы Event; назначения уникальны по Event/Person; participant и buyer различаются; правила ролей и регистраций проверяются в use cases; Event/Person экраны показывают связи; школьные schedule/groups/branches/styles/students удалены вместе с UI и API.

**Проверки:** application/API tests, полный milestone E2E, UI в двух темах и desktop/mobile.

**Зависимости:** 4. **Файлы:** modules/events/registrations/choreographers, Event/Person UI, routeConfig/sidebar, legacy schedule и slices. **Объём:** отдельные S/M срезы по каждому сценарию.

### 6. Ticketing и Weeztix

**Результат:** purchase появляется в Order/Ticket, Event и Person без дубликатов.

**Критерии:** проверенный актуальный API Weeztix, provider adapter с нормализованными DTO; Decimal amounts; ExternalIdentity; buyer/holder resolution; атомарный импорт; jobs/lock/retry/history/health; повтор и частичный сбой не дублируют данные; старое billing удалено после отвязки потребителей.

**Проверки:** mocked provider payloads, concurrent/repeated import, rollback tests, sync E2E.

**Зависимости:** 5. **Файлы:** integrations/ticketing/weeztix, modules/ticketing/jobs/providers, Order/Ticket UI, legacy billing modules/scripts/dependencies. **Объём:** S/M срезы adapter, import, worker и UI.

### 7. Сохранённый email → Communications/Gmail

**Результат:** входящее письмо сохраняется в Inbox, ответ уходит через провайдер и сохраняется.

**Критерии:** EmailProvider/Gmail adapter, dedup по provider/message ID; Conversation/Message; безопасное связывание Person/Event; ручной reply; только подтверждённая отправка отмечается sent; ingestion не зависит от AI; перенос старых email relations и удаление legacy email model/API после переключения.

**Проверки:** email tests, ingestion/send failure и retry tests, mocked Gmail, inbox/thread/reply E2E.

**Зависимости:** 5; ticket context после 6. **Файлы:** communication/email, modules/communications, integrations/email/gmail, EmailPage/EmailMessage/EmailAccount. **Объём:** S/M срезы.

### 8. Сохранённые AI/RAG → event context и human approval

**Результат:** AI создаёт обоснованный draft; сотрудник редактирует/утверждает/отправляет.

**Критерии:** adapters OpenAI/Ollama; Zod output validation; event/global knowledge filtering и hybrid retrieval; contextSnapshot, promptVersion, actor/approval; insufficient context → needsHuman; approval проверяется сервером; удалены auto-send без human approval и Telegram approval; отказ AI не блокирует CRM/email.

**Проверки:** existing пригодные AI tests + event-context/grounding/prompt-injection/approval tests; E2E draft → edit → approve/send; embedding failure/retry.

**Зависимости:** 6–7. **Файлы:** ai-email-assistant/knowledge-ingestion, modules/ai/knowledge, integrations/ai, KnowledgeBasePage, inbox draft UI. **Объём:** S/M срезы.

### 9. Dashboard, search, settings и hardening

**Результат:** dashboard показывает event KPI, Inbox attention, Activity и provider health.

**Критерии:** indexed aggregates; grouped search Person/Event/order/ticket; provider settings и sync history; GDPR export/anonymization/retention; sanitized structured logs; backup/restore; финальная навигация и переводы отражают спецификацию.

**Проверки:** aggregate/search/security tests, provider outage scenarios, dashboard/settings E2E, desktop/mobile/light/dark.

**Зависимости:** 6–8. **Файлы:** dashboard/HomePage/Summary, search, settings, infrastructure/logger, backup scripts. **Объём:** S/M срезы.

### 10. Финальное удаление legacy и приёмка V1

**Результат:** все 22 пункта §80 работают; заменённые возможности физически удалены.

**Критерии:** нет legacy runtime imports/routes/cron/Prisma models/UI/test commands/dependencies и школьных prompts; нет параллельных Client/Person identity systems; сохранены нужные email/AI/dashboard; исторические SQL migrations могут оставаться только как архив вне исполняемой цепочки; docs отражают фактическое состояние.

**Проверки:** npm run ci, check:skylos, affected Playwright suite, dependency/secret scan, diff/code review, graphify:specs, docs:links. Проверка внешних провайдеров в mock E2E и отдельно с согласованными test accounts.

**Зависимости:** 1–9. **Файлы:** весь затронутый граф, package scripts/dependencies, docs, e2e. **Объём:** S/M cleanup срезы.

## Риски и решения

| Риск | Как снизить |
|---|---|
| Потеря существующих данных | Решение о переносе, backup, restore test, dry run и сверка до cutover. |
| Удаление Client ломает email/AI | Сначала перенести consumers на Person, затем удалить Client и связи в том же срезе. |
| UUID/RBAC ломают вход | Миграция user/session contracts, отрицательные permission tests и login E2E до core UI. |
| Смена MySQL затрагивает raw SQL/native types | Поиск raw queries, миграций и native annotations; проверка на PostgreSQL. |
| Автоматическая отправка старого AI | Проверить все send paths/workers, ввести обязательный persisted human approval. |
| Неполный контракт schedule/registration uniqueness | Зафиксировать ADR до implementation; не придумывать школьную семантику. |
| Несогласованные provider API | Проверить официальные Weeztix/Gmail/OpenAI/Ollama документы перед adapters. |

## Решение о данных

Пользователь подтвердил старт с пустой базой. Старые contacts, users, emails, knowledge и финансовая история не импортируются. Новые миграции применяются к отдельной PostgreSQL-базе. Старую базу и volumes не сбрасываем и не удаляем. Demo seed применяется только в development/test; production owner создаётся отдельной явно запускаемой командой.
