#!/usr/bin/env bash
set -euo pipefail

e2e_database_url='mysql://ddc_e2e:ddc_e2e_password@127.0.0.1:13306/ddc_e2e'

docker compose -f docker-compose.e2e.yml up --detach --wait

(
    cd server
    DATABASE_URL="$e2e_database_url" npx prisma db push --schema prisma/schema --force-reset
    DATABASE_URL="$e2e_database_url" npx ts-node scripts/e2e-seed.ts
)
