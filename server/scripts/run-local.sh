#!/usr/bin/env bash
# Runs a server script (e.g. test-email-flow.ts) against Ollama and MySQL as reached from the
# HOST (not from inside a Docker container). The repo's root .env is written for the backend
# container's network — OLLAMA_URL points at host.docker.internal and there's no DATABASE_URL at
# all (the container builds it from DB_USER/DB_PASSWORD/DB_NAME) — so both need a host-side
# override here rather than just sourcing .env as-is.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ROOT_ENV="../.env"
if [ ! -f "$ROOT_ENV" ]; then
    echo "Expected $ROOT_ENV (repo root .env) not found." >&2
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ROOT_ENV"
set +a

export OLLAMA_URL="${OLLAMA_URL_LOCAL:-http://127.0.0.1:11434}"
export DATABASE_URL="${DATABASE_URL:-mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}}"

# Printed so a misconfiguration (wrong model, unreachable DB) is visible immediately instead of
# surfacing as a confusing Prisma/fetch error several stages into the pipeline.
echo "[run-local] OLLAMA_URL=$OLLAMA_URL OLLAMA_MODEL=${OLLAMA_MODEL:-<unset, code default applies>} DATABASE_URL=mysql://${DB_USER}:***@127.0.0.1:${DB_PORT}/${DB_NAME}" >&2

exec npx ts-node "$@"
