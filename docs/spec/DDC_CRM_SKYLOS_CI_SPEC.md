# Спецификация: интеграция Skylos Checker в CI/CD HHDC Admin

**Статус:** Proposed  
**Проект:** HHDC Admin  
**Область:** GitHub Actions / CI Quality Gate  
**Инструмент:** Skylos  
**Цель:** добавить отдельную автоматическую проверку кода в Pull Request и CI без доступа к production deployment.

---

## 1. Цель

Добавить Skylos как отдельный CI quality/security check.

Skylos должен:

- запускаться автоматически в GitHub Actions;
- работать отдельным job со стабильным именем `skylos-check`;
- анализировать repository до merge;
- не иметь доступа к production secrets;
- не запускать deployment;
- сначала работать как informational check;
- после baseline стать required merge gate;
- не заменять ESLint, Stylelint, Jest, server tests и production build;
- в перспективе проверять изменения Pull Request относительно base branch.

---

## 2. Место в CI/CD

Диаграмма ниже использует `feature/*` как в исходной проработке; фактически принятый короткий
префикс — `feat/*` (см. AGENTS.md и сноску в `docs/spec/DDC_CRM_CICD_SPEC.md` §0).

```text
feature/*
    │
    ▼
Pull Request
    │
    ▼
develop / main
    │
    ▼
CI
├── client-checks
├── server-checks
├── docs-links
└── skylos-check
      │
      ▼
   PASS / FAIL
      │
      ▼
merge decision
```

Production остается отдельным этапом:

```text
main
 ↓
CI
 ↓
ALL REQUIRED CHECKS PASS
 ↓
production deploy
```

---

## 3. Роль Skylos

Skylos используется как дополнительный static-analysis / security / quality scanner.

Он дополняет:

```text
ESLint
Stylelint
Jest
Node test runner
TypeScript build
Markdown link checker
```

Основные категории анализа:

```text
dead code
dangerous flows
secrets
quality findings
dependency/SCA checks
AI-generated code regressions
```

Фактический набор проверок зависит от версии Skylos и поддержки языка.

---

## 4. Ограничение HHDC Admin

HHDC Admin — преимущественно TypeScript/JavaScript monorepo:

```text
client/ → React + TypeScript
server/ → Express + TypeScript
```

Поэтому нельзя сразу включать Skylos как blocking gate.

Сначала необходимо проверить:

- coverage TypeScript/JavaScript;
- качество signal;
- false positives;
- стабильность результатов;
- пользу diff scan;
- время выполнения.

---

## 5. Rollout strategy

### Phase A — informational

```text
PR
├── client-checks    REQUIRED
├── server-checks    REQUIRED
├── docs-links       REQUIRED
└── skylos-check     INFORMATIONAL
```

Цель:

- получить baseline;
- оценить false positives;
- выбрать правила;
- определить thresholds;
- проверить стабильность.

### Phase B — blocking

```text
PR
├── client-checks    REQUIRED
├── server-checks    REQUIRED
├── docs-links       REQUIRED
└── skylos-check     REQUIRED
```

---

## 6. Локальная установка

Skylos требует Python 3.10+.

```bash
python3 -m pip install skylos
skylos --version
```

Первый scan:

```bash
skylos .
```

Основной audit:

```bash
skylos . -a
```

Перед изменением GitHub Actions обязательно выполнить:

```bash
skylos . -a
```

локально на HHDC Admin.

---

## 7. Repository-owned config

После первого анализа при необходимости:

```bash
skylos init
```

Это может создать или дополнить:

```text
pyproject.toml
```

с секцией:

```toml
[tool.skylos]
```

Config должен хранить:

- thresholds;
- exclusions;
- scanner policy.

Рекомендуется держать policy в repository, а не только внутри GitHub Actions YAML.

---

## 8. Автогенерация CI

Skylos поддерживает:

```bash
skylos cicd init
```

Эту команду можно использовать как генератор reference workflow.

Сгенерированный workflow необходимо вручную проверить:

- triggers;
- permissions;
- Python version;
- package version;
- secrets;
- PR behavior;
- upload behavior;
- quality gate;
- совместимость с текущим `ci.yml`.

Предпочтительный вариант HHDC Admin:

```text
существующий .github/workflows/ci.yml
              +
       отдельный job
         skylos-check
```

---

## 9. CI job name

Использовать стабильное имя:

```text
skylos-check
```

Оно позже будет использоваться в GitHub Ruleset.

---

## 10. Начальная реализация job

Добавить в:

```text
.github/workflows/ci.yml
```

```yaml
skylos:
  name: skylos-check
  runs-on: ubuntu-latest

  permissions:
    contents: read

  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: "3.12"

    - name: Install Skylos
      run: python -m pip install "skylos>=4.7.0"

    - name: Run Skylos audit
      run: skylos . -a
```

Это стартовая конфигурация, не финальная blocking policy.

---

## 11. Зачем `fetch-depth: 0`

Для diff-based проверки нужен Git history.

```yaml
with:
  fetch-depth: 0
```

Это позволит использовать:

```bash
skylos diff ...
```

---

## 12. Permissions

Для PR scanner:

```yaml
permissions:
  contents: read
```

Не выдавать без необходимости:

```text
id-token: write
repository write
deploy permissions
SSH secrets
production environment secrets
```

---

## 13. PR trigger security

Использовать обычный:

```yaml
pull_request:
```

Не использовать для untrusted PR code:

```yaml
pull_request_target:
```

если scanner workflow получает повышенные permissions или secrets.

---

## 14. PR diff scan

После baseline рекомендуется добавить changed-code analysis.

Концепция:

```bash
git fetch origin "${{ github.base_ref }}"
skylos diff "origin/${{ github.base_ref }}..HEAD" --danger
```

Перед merge необходимо проверить актуальный синтаксис установленной версии Skylos.

Целевая модель:

```text
Skylos
  ├── repository audit
  └── PR diff security scan
```

---

## 15. Явная CI policy

После baseline вместо общего:

```bash
skylos . -a
```

можно использовать явный контракт:

```bash
skylos . --danger --quality --secrets
```

Преимущество:

- CI policy видна явно;
- проще понимать failures;
- проще менять правила.

Сначала сравнить результаты обоих вариантов на HHDC Admin.

---

## 16. SCA

Если версия Skylos поддерживает:

```bash
--sca
```

проверить его отдельно.

До blocking режима проверить:

- поддержку npm dependency graph;
- client/package-lock.json;
- server/package-lock.json;
- время выполнения;
- качество результатов.

---

## 17. Secrets scan

Рекомендуется проверить:

```bash
skylos . --secrets
```

Это дополнительный слой защиты для:

```text
API keys
tokens
credentials
случайно закоммиченных env values
```

Он не заменяет:

```text
.env → .gitignore
production secrets → GitHub Environment Secrets
```

---

## 18. Informational mode

В Phase A Skylos не добавляется в Required Status Checks.

Предпочтительно НЕ использовать:

```bash
skylos . -a || true
```

Пусть GitHub показывает реальный статус job.

```text
skylos-check ✕
```

может быть красным, но merge пока технически разрешен.

Так сохраняется реальная observability.

---

## 19. Baseline period

Минимум:

```text
5–10 реальных Pull Request
```

или несколько дней активной разработки.

Собирать:

- findings count;
- categories;
- false positives;
- execution time;
- unstable rules;
- applicability к TypeScript;
- полезные security findings.

---

## 20. Gate criteria

Перед blocking режимом ответить:

```text
1. Находит ли Skylos реальные проблемы?
2. Каков уровень false positives?
3. Повторяемы ли результаты?
4. Понимает ли client/server структуру?
5. Полезен ли diff scan?
6. Не замедляет ли CI критично?
7. Какие findings должны блокировать merge?
8. Какие findings должны быть advisory?
```

---

## 21. GitHub Ruleset

После baseline добавить:

```text
skylos-check
```

в Required Status Checks для:

```text
develop
main
```

Итог:

```text
client-checks
server-checks
docs-links
skylos-check
```

При failure:

```text
Skylos FAIL
    ↓
MERGE BLOCKED
```

---

## 22. Relation с production deployment

Deploy не должен зависеть напрямую только от Skylos.

Правильно:

```text
main
 ↓
CI
 ↓
client-checks PASS
server-checks PASS
docs-links PASS
skylos-check PASS
 ↓
CI SUCCESS
 ↓
production deploy
```

---

## 23. Skylos Cloud — optional

Первая версия должна работать без Cloud.

Начальный scope:

```text
local CLI
+
GitHub Actions scanner
```

Cloud добавлять отдельно, если нужны:

- scan history;
- dashboard;
- centralized policy;
- team collaboration;
- trends.

---

## 24. OIDC — только trusted push

Skylos поддерживает tokenless GitHub CI через OIDC для trusted branch push.

Если Cloud будет добавлен позже:

```yaml
permissions:
  contents: read
  id-token: write
```

Но PR scanner должен оставаться без privileged cloud credentials.

Рекомендуемое разделение:

```text
PR scanner
  → contents: read
  → no production/cloud secrets

trusted push main/develop
  → optional OIDC upload
```

---

## 25. Version pinning

После baseline зафиксировать проверенную версию.

Не оставлять навсегда:

```bash
pip install skylos
```

Целевая форма:

```bash
python -m pip install "skylos==X.Y.Z"
```

или контролируемый compatible range.

---

## 26. Wrapper script

Рекомендуется создать:

```text
scripts/check-skylos.sh
```

Пример:

```bash
#!/usr/bin/env bash
set -euo pipefail

skylos . --danger --quality --secrets
```

Тогда один contract используют:

```text
Developer
AI Agent
GitHub Actions
      │
      ▼
scripts/check-skylos.sh
```

---

## 27. Root package script

Опционально:

```json
{
  "scripts": {
    "check:skylos": "./scripts/check-skylos.sh"
  }
}
```

Запуск:

```bash
npm run check:skylos
```

---

## 28. AI Agent workflow

```text
AI Agent
   ↓
changes code
   ↓
npm run check:skylos
   ↓
npm run ci
   ↓
fix findings
   ↓
push
   ↓
PR
   ↓
GitHub repeats Skylos
```

Agent не должен автоматически suppress findings без анализа причины.

---

## 29. Suppressions

False positive нельзя решать глобальным отключением scanner.

Suppression должна быть:

- scoped;
- reviewable;
- документированной;
- сохраненной в repository config;
- по возможности временной/обоснованной.

Не использовать постоянно:

```text
continue-on-error
disable all secrets checks
disable all danger checks
```

---

## 30. Exclusions

До blocking режима проверить необходимость исключения:

```text
client/build/
coverage/
node_modules/
generated files
temporary files
vendor code
generated Prisma artifacts
```

Фактические exclusions определяются после первого scan.

---

## 31. Monorepo validation

Сравнить:

```bash
skylos .
```

с:

```bash
skylos client
skylos server
```

Предпочтение — единый root scan, если он дает качественный результат.

---

## 32. Scope первой реализации

Входит:

```text
1. local validation
2. Python 3.12
3. Skylos install
4. skylos-check job
5. repository audit
6. PR support
7. full git checkout
8. least permissions
9. informational rollout
10. documentation
```

Не входит:

```text
Cloud upload
OIDC
LLM provider integration
automatic remediation
automatic suppressions
mandatory gate
MCP integration
SCA blocking
```

---

## 33. Возможные изменяемые файлы

```text
.github/workflows/ci.yml
pyproject.toml
scripts/check-skylos.sh
package.json
README.md
docs/spec/*
```

Не изменять в рамках этой задачи:

```text
deploy.yml
production secrets
Docker deployment contract
```

---

## 34. Implementation sequence

### Step 1

```bash
python3 -m pip install skylos
skylos --version
skylos . -a
```

### Step 2

Проверить:

```text
root
client/
server/
```

### Step 3

При необходимости:

```bash
skylos init
```

### Step 4

Создать:

```text
scripts/check-skylos.sh
```

### Step 5

Опционально добавить:

```text
npm run check:skylos
```

### Step 6

Добавить `skylos-check` в `ci.yml`.

### Step 7

Создать:

```text
feature/skylos-ci
```

и PR:

```text
feature/skylos-ci → develop
```

### Step 8

Проверить GitHub Checks:

```text
client-checks
server-checks
docs-links
skylos-check
```

### Step 9

Оставить Skylos informational.

### Step 10

Собрать baseline.

### Step 11

Настроить exclusions / thresholds / explicit flags.

### Step 12

После отдельного решения включить Required Status Check.

---

## 35. Acceptance Criteria — Phase A

- [x] Skylos устанавливается локально. (`pip install skylos`, версия 4.35.0)
- [x] `skylos --version` работает.
- [x] Root repository сканируется (`skylos . -a` прогнан локально на полном репозитории).
- [x] Выбран полезный scan command: `skylos . -a --format concise --github --exclude coverage --exclude graphify-out`,
      `SKYLOS_GREP_BUDGET=120` (дефолтные 30s стабильно не хватает на этом репозитории — grep-verification
      уходит в `SKY-ANALYSIS-INCOMPLETE`/exit 2 вместо честного pass/fail).
- [ ] `skylos-check` запускается в GitHub Actions. — проверить после push/PR.
- [ ] Job работает для PR в `develop`. — проверить после push/PR.
- [ ] Job работает для PR в `main`. — тот же workflow-триггер, что и `develop`; проверить после push/PR.
- [x] `fetch-depth: 0` включен.
- [x] `contents: read` достаточно (единственная указанная permission).
- [x] Job не получает production secrets (env job'а не ссылается ни на один secret).
- [x] Job не вызывает deployment (нет шагов деплоя).
- [ ] Logs Skylos видны. — проверить после push/PR.
- [ ] Existing CI jobs не сломаны. — проверить после push/PR.
- [x] Skylos пока не required (GitHub Ruleset не менялся).

---

## 36. Acceptance Criteria — Phase B

- [ ] Baseline завершен.
- [ ] False positives проанализированы.
- [ ] Exclusions зафиксированы.
- [ ] Scanner version зафиксирована.
- [ ] CI command стабилен.
- [ ] Выбран blocking policy.
- [ ] Diff scan проверен.
- [ ] `skylos-check` required для `develop`.
- [ ] `skylos-check` required для `main`.
- [ ] Failure блокирует merge.
- [ ] Success позволяет merge при остальных green checks.

---

## 37. Test scenarios

### Scenario A — normal PR

```text
feature/*
 ↓
PR → develop
 ↓
Skylos PASS
 ↓
other checks PASS
 ↓
merge allowed
```

### Scenario B — Skylos finding

Phase A:

```text
skylos-check FAIL
merge технически разрешен
finding reviewed manually
```

Phase B:

```text
skylos-check FAIL
merge blocked
```

### Scenario C — develop

```text
merge → develop
 ↓
CI + Skylos
 ↓
NO production deploy
```

### Scenario D — main

```text
develop → main PR
 ↓
all checks PASS
 ↓
merge
 ↓
main CI PASS
 ↓
production deploy
```

### Scenario E — scanner infrastructure failure

```text
Skylos install/run error
 ↓
skylos-check FAIL
```

Не маскировать ошибку.

---

## 38. Рекомендуемый initial workflow snippet

```yaml
skylos:
  name: skylos-check
  runs-on: ubuntu-latest

  permissions:
    contents: read

  steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: "3.12"

    - name: Install Skylos
      run: python -m pip install "skylos>=4.7.0"

    - name: Run Skylos
      run: skylos . -a
```

---

## 39. Mature target

```text
PR
 │
 ├── client-checks
 ├── server-checks
 ├── docs-links
 └── skylos-check
      ├── secrets
      ├── danger/security
      ├── quality
      ├── optional SCA
      └── PR diff regression scan
              │
              ▼
           PASS
              │
              ▼
           merge
```

---

## 40. Security principles

```text
least privilege
no production secrets in PR jobs
no privileged pull_request_target execution
repository-owned policy
pinned scanner version
visible failures
reviewable suppressions
separation between CI and deployment
```

---

## 41. Главный контракт

```text
Lint
 ↓
Tests
 ↓
Build
 ↓
Skylos
 ↓
Review
 ↓
Merge
```

Skylos усиливает существующий CI, но не заменяет:

```text
tests
type checks
lint
human review
production safeguards
```

Первая итерация считается завершенной, если в Pull Request отображается:

```text
✓ client-checks
✓ server-checks
✓ docs-links
✓ skylos-check
```

а findings Skylos видны как отдельный CI result.

После подтверждения качества scanner:

```text
skylos-check
```

становится Required Status Check для `develop` и `main`.
