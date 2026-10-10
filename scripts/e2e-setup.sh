#!/usr/bin/env bash
set -euo pipefail

# The password of the throwaway E2E database comes from the environment (CI) or the root .env (local).
if [ -z "${E2E_DATABASE_PASSWORD:-}" ] && [ -f .env ]; then
    E2E_DATABASE_PASSWORD="$(sed -n 's/^E2E_DATABASE_PASSWORD=//p' .env | tail -n 1)"
fi
if [ -z "${E2E_DATABASE_PASSWORD:-}" ]; then
    echo 'Set E2E_DATABASE_PASSWORD in the environment or in the root .env (see .env.example).' >&2
    exit 1
fi
export E2E_DATABASE_PASSWORD

e2e_database_url="postgresql://hhdc_e2e:${E2E_DATABASE_PASSWORD}@127.0.0.1:55434/hhdc_crm_e2e?schema=public"

# Every run starts from an empty database: the E2E container and its volume are disposable.
docker compose -f docker-compose.e2e.yml down --volumes
docker compose -f docker-compose.e2e.yml up --detach --wait

(
    cd server
    export DATABASE_URL="$e2e_database_url"
    # Playwright starts the compiled server, so the build has to be current.
    npm run build
    npx prisma migrate deploy --schema prisma/schema
    SEED_OWNER_EMAIL='e2e.admin@example.test' SEED_OWNER_PASSWORD='e2e-password-2026' SEED_OWNER_NAME='E2E Admin' \
        npx ts-node --files prisma/seed.ts
    npx ts-node --files prisma/seed-e2e.ts
)
