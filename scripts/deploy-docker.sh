#!/usr/bin/env bash
# Docker-based production deploy. The permanent staging stack was removed on
# 2026-08-18, so this script targets the single live Docker stack by default.
#
# Usage:
#   ./scripts/deploy-docker.sh [--no-cache] [--skip-smoke]
# Config comes from .deploy-docker.env (see .deploy-docker.env.example), or env vars.

set -Eeuo pipefail

NO_CACHE=false
SKIP_SMOKE=false

for arg in "$@"; do
    case "$arg" in
        --no-cache)
            NO_CACHE=true
            ;;
        --skip-smoke)
            SKIP_SMOKE=true
            ;;
        *)
            echo "Неизвестный флаг: $arg"
            echo "Использование: ./scripts/deploy-docker.sh [--no-cache] [--skip-smoke]"
            exit 1
            ;;
    esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_DOCKER_CONFIG:-$ROOT_DIR/.deploy-docker.env}"

if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/project/hhdc_docker_prod}"
HEALTHCHECK_PORT="${BACKEND_PORT_PROD:-38080}"
FRONTEND_CHECK_PORT="${FRONTEND_PORT_PROD:-3030}"

if [[ -z "$DEPLOY_HOST" ]]; then
    echo "Укажите сервер: создайте .deploy-docker.env на основе .deploy-docker.env.example"
    echo "(DEPLOY_HOST=root@SERVER_IP), либо экспортируйте DEPLOY_HOST перед запуском."
    exit 1
fi

if [[ "$REMOTE_PATH" != "/var/www/project/hhdc_docker_prod" ]]; then
    echo "ОШИБКА: production deploy разрешён только в /var/www/project/hhdc_docker_prod."
    echo "Текущее значение REMOTE_PATH=$REMOTE_PATH"
    exit 1
fi

for command in ssh rsync; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "Не найдена команда: $command"
        exit 1
    fi
done

echo "==> Проверяем подключение к $DEPLOY_HOST, создаём $REMOTE_PATH при необходимости"
ssh "$DEPLOY_HOST" "mkdir -p '$REMOTE_PATH'"

echo "==> Синхронизируем исходники (без node_modules/.env/build/загрузок)"
rsync -az --delete \
    --exclude '.git' \
    --exclude '.github' \
    --exclude '.claude' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude 'client/node_modules' \
    --exclude 'client/build' \
    --exclude 'client/storybook-static' \
    --exclude 'client/coverage' \
    --exclude 'server/node_modules' \
    --exclude 'server/build' \
    --exclude 'server/dist' \
    --exclude 'server/public/upload' \
    --exclude 'server/private-uploads' \
    --exclude 'server/src/logs' \
    --exclude 'backups' \
    "$ROOT_DIR/" \
    "$DEPLOY_HOST:$REMOTE_PATH/"

echo "==> Проверяем .env на сервере (docker compose читает $REMOTE_PATH/.env)"
ssh "$DEPLOY_HOST" "test -f '$REMOTE_PATH/.env'" || {
    echo "На сервере отсутствует $REMOTE_PATH/.env — скопируйте .env.example и заполните"
    echo "реальными production-секретами."
    exit 1
}

echo "==> Проверяем, что remote .env описывает production live stack"
ssh "$DEPLOY_HOST" bash -s -- "$REMOTE_PATH" <<'ENV_GUARD'
set -Eeuo pipefail
REMOTE_PATH="$1"
cd "$REMOTE_PATH"

get_env_value() {
    local name="$1"
    awk -F= -v key="$name" '
        $0 ~ "^[[:space:]]*" key "=" {
            value = substr($0, index($0, "=") + 1)
            gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
            gsub(/^"|"$/, "", value)
            gsub(/^'\''|'\''$/, "", value)
            print value
            exit
        }
    ' .env
}

required_pairs=(
    "FRONTEND_CONTAINER_NAME=hhdc-client-live"
    "BACKEND_CONTAINER_NAME=hhdc-backend-live"
    "DB_CONTAINER_NAME=hhdc-mysql-live"
    "REDIS_CONTAINER_NAME=hhdc-redis-live"
    "FRONTEND_PORT_PROD=3030"
    "BACKEND_PORT_PROD=38080"
    "DB_PORT=33062"
    "REDIS_PORT=16381"
)

for pair in "${required_pairs[@]}"; do
    name="${pair%%=*}"
    expected="${pair#*=}"
    actual="$(get_env_value "$name")"
    if [[ "$actual" != "$expected" ]]; then
        echo "ОШИБКА: $name должен быть '$expected', сейчас '${actual:-<empty>}'"
        exit 1
    fi
done
ENV_GUARD

echo "==> Собираем и поднимаем docker-стек на сервере"
ssh "$DEPLOY_HOST" bash -s -- "$REMOTE_PATH" "$NO_CACHE" <<'REMOTE_SCRIPT'
set -Eeuo pipefail
REMOTE_PATH="$1"
NO_CACHE="$2"

cd "$REMOTE_PATH"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

if [[ "$NO_CACHE" == "true" ]]; then
    $COMPOSE build --no-cache
    $COMPOSE up -d
else
    $COMPOSE up --build -d
fi

$COMPOSE ps
REMOTE_SCRIPT

echo "==> Деплой контейнеров завершён"

if [[ "$SKIP_SMOKE" == "false" ]]; then
    echo "==> Smoke-check: backend health (до 90с ожидания готовности)"
    ssh "$DEPLOY_HOST" bash -s -- "$HEALTHCHECK_PORT" "$FRONTEND_CHECK_PORT" "$REMOTE_PATH" <<'SMOKE_SCRIPT'
set -Eeuo pipefail
BACKEND_PORT="$1"
FRONTEND_PORT="$2"
REMOTE_PATH="$3"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

BACKEND_READY=false
for attempt in $(seq 1 18); do
    if BODY="$(curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/v1/health" 2>/dev/null)"; then
        echo "$BODY" | grep -q '"status":"ok"' && BACKEND_READY=true && break
    fi
    echo "  backend ещё не готов, попытка ${attempt}/18..."
    sleep 5
done

if [[ "$BACKEND_READY" != "true" ]]; then
    echo "ОШИБКА: backend не ответил health-check за 90 секунд. Логи:"
    cd "$REMOTE_PATH" && $COMPOSE logs --tail=80 backend
    exit 1
fi
echo "backend health: OK"

echo "==> frontend: http://127.0.0.1:${FRONTEND_PORT}/"
curl -fsSI "http://127.0.0.1:${FRONTEND_PORT}/" | head -n 1
SMOKE_SCRIPT
    echo "==> Smoke-check пройден"
fi

echo "==> Deploy завершён успешно"
