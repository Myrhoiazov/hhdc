#!/usr/bin/env bash
# Перегенерирует единый граф (для агента, MCP) и три HTML-дерева в docs/spec.
# Запуск из корня репозитория: bash scripts/graphify-update-docs.sh
# Или через npm-скрипт: npm run graphify:specs
#
# Backend выбирается автоматически:
#   1) облачный LLM-ключ в env -> полный --mode deep (+wiki, semantic-pass);
#   2) иначе локальный Ollama (см. TASK.md §6): установка/сервис/модель
#      проверяются по порядку и докидываются только если чего-то нет;
#   3) если Ollama поднять не удалось -> откат на --code-only (без падения).
#
# Модель Ollama переопределяется:
#   GRAPHIFY_OLLAMA_MODE=qwen2.5-coder:7b bash scripts/graphify-update-docs.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OLLAMA_MODEL="${GRAPHIFY_OLLAMA_MODEL:-qwen2.5-coder:7b}"
OLLAMA_URL="http://localhost:11434"

log_ok() { echo "  [ok] $*"; }
log_do() { echo "  [--] $*"; }

if ! command -v graphify >/dev/null 2>&1; then
  echo "graphify не найден в PATH." >&2
  echo "Установка: uv tool install graphifyy && graphify install" >&2
  exit 1
fi

if [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ] \
  || [ -n "${MOONSHOT_API_KEY:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ] \
  || [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${DEEPSEEK_API_KEY:-}" ]; then
  echo "==> Найден облачный LLM-ключ — режим --mode deep (--wiki, semantic-pass)"
  ROOT_FLAGS=(--mode deep --wiki)
  NESTED_FLAGS=(--mode deep)
  IS_LLM=1
  LABEL_ARGS=()
else
  echo "Облачного ключа нет — проверяю локальный Ollama:"
  ollama_ok=1

  # 1. Установлена ли Ollama
  if command -v ollama >/dev/null 2>&1; then
    log_ok "Ollama установлена: $(command -v ollama)"
  else
    log_do "Ollama не установлена — ставлю через официальный скрипт ollama.com/install.sh..."
    if ! curl -fsSL https://ollama.com/install.sh | sh; then
      echo "  Установить Ollama не удалось."
      ollama_ok=0
    elif ! command -v ollama >/dev/null 2>&1; then
      echo "  Установка завершилась, но 'ollama' не появился в PATH."
      ollama_ok=0
    else
      log_ok "Ollama установлена: $(command -v ollama)"
    fi
  fi

  # 2. Запущен ли сервис
  if [ "$ollama_ok" -eq 1 ]; then
    if curl -sf -m 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
      log_ok "Сервис Ollama уже отвечает на $OLLAMA_URL"
    else
      log_do "Сервис Ollama не отвечает — поднимаю 'ollama serve' в фоне..."
      (nohup ollama serve >/tmp/ollama-serve-graphify.log 2>&1 &)
      service_up=0
      for _ in $(seq 1 15); do
        sleep 1
        if curl -sf -m 2 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
          service_up=1
          break
        fi
      done
      if [ "$service_up" -eq 1 ]; then
        log_ok "Сервис Ollama поднялся на $OLLAMA_URL"
      else
        echo "  Сервис не поднялся за 15 секунд (лог: /tmp/ollama-serve-graphify.log)."
        ollama_ok=0
      fi
    fi
  fi

  # 3. Скачана ли модель
  if [ "$ollama_ok" -eq 1 ]; then
    if ollama list 2>/dev/null | awk '{print $1}' | grep -Fxq "$OLLAMA_MODEL"; then
      log_ok "Модель $OLLAMA_MODEL уже скачана"
    else
      log_do "Модель $OLLAMA_MODEL не найдена локально — скачиваю..."
      if ! ollama pull "$OLLAMA_MODEL"; then
        echo "  Скачать модель не удалось."
        ollama_ok=0
      fi
    fi
  fi

  if [ "$ollama_ok" -eq 1 ]; then
    IS_LLM=1
    # Грабли Ollama-backend'а (TASK.md §6):
    # - graphify CLI требует OLLAMA_API_KEY даже для локальной Ollama;
    # - дефолтный контекст Ollama 2048 токенов ломает semantic-extraction молча;
    # - если чанк не влезает в NUM_CTX, модель молчит — лечится уменьшением
    #   чанков (GRAPHIFY_OLLAMA_TOKEN_BUDGET) вместо роста контекста.
    export OLLAMA_API_KEY="${OLLAMA_API_KEY:-dummy}"
    export GRAPHIFY_OLLAMA_NUM_CTX="${GRAPHIFY_OLLAMA_NUM_CTX:-32768}"
    TOKEN_BUDGET_ARGS=()
    if [ -n "${GRAPHIFY_OLLAMA_TOKEN_BUDGET:-}" ]; then
      TOKEN_BUDGET_ARGS=(--token-budget "$GRAPHIFY_OLLAMA_TOKEN_BUDGET")
      echo "==> Чанки семантики ограничены: --token-budget $GRAPHIFY_OLLAMA_TOKEN_BUDGET"
    fi
    echo "==> Использую локальный backend: ollama / $OLLAMA_MODEL (semantic-pass может занять от минут до часа — это нормально)"
    LABEL_ARGS=(--backend=ollama --model="$OLLAMA_MODEL" --max-concurrency 1)
    ROOT_FLAGS=(--mode deep --wiki --backend ollama --model "$OLLAMA_MODEL" --max-concurrency 1 ${TOKEN_BUDGET_ARGS[@]+"${TOKEN_BUDGET_ARGS[@]}"})
    NESTED_FLAGS=(--mode deep --backend ollama --model "$OLLAMA_MODEL" --max-concurrency 1 ${TOKEN_BUDGET_ARGS[@]+"${TOKEN_BUDGET_ARGS[@]}"})
  else
    IS_LLM=0
    echo "!! Ollama недоступна — откатываюсь на --code-only (AST без semantic-pass, wiki и имён сообществ)." >&2
    ROOT_FLAGS=(--code-only)
    NESTED_FLAGS=(--code-only)
  fi
fi

mkdir -p docs/spec

echo "==> [1/3] Единый граф проекта (для агента, MCP) + PROJECT_TREE.html"
graphify . "${ROOT_FLAGS[@]}"
# graphify 0.9.x: «голая» сборка не строит отчёт/имена/wiki сама — нужен cluster-only
# (GRAPH_REPORT.md + graph.html), затем label (LLM-имена сообществ) и export wiki.
graphify cluster-only .
if [ "$IS_LLM" -eq 1 ]; then
  graphify label . ${LABEL_ARGS[@]+"${LABEL_ARGS[@]}"}
  graphify export wiki --graph graphify-out/graph.json
fi
# graphify пишет результат в <path>/graphify-out
cp graphify-out/graph.html docs/spec/PROJECT_TREE.html

echo "==> [2/3] Дерево сервера (server/src) -> SERVER_SRC_TREE.html"
(
  cd server
  graphify ./src "${NESTED_FLAGS[@]}"
  graphify cluster-only ./src >/dev/null 2>&1 || graphify cluster-only ./src
  cp src/graphify-out/graph.html ../docs/spec/SERVER_SRC_TREE.html
)

echo "==> [3/3] Дерево клиента (client/src) -> CLIENT_SRC_TREE.html"
(
  cd client
  graphify ./src "${NESTED_FLAGS[@]}"
  graphify cluster-only ./src >/dev/null 2>&1 || graphify cluster-only ./src
  cp src/graphify-out/graph.html ../docs/spec/CLIENT_SRC_TREE.html
)

echo ""
echo "Готово. Обновлены:"
echo "  docs/spec/PROJECT_TREE.html"
echo "  docs/spec/SERVER_SRC_TREE.html"
echo "  docs/spec/CLIENT_SRC_TREE.html"
echo "  graphify-out/graph.json          (корневой граф для MCP-сервера агента)"
