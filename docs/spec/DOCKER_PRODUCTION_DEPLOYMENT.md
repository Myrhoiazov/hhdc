# Docker Production Deployment Specification

Status: **active production specification**.

`hhdc` runs on one live Docker Compose stack on the VPS. This repository has one production
deploy path: Docker Compose.

## Live Stack

```text
host: root@SERVER_IP
path: /var/www/project/hhdc_docker_prod
domain: https://hhdc.example.com
```

Containers:

```text
hhdc-client-live
hhdc-backend-live
hhdc-mysql-live
hhdc-redis-live
```

Ports:

```text
frontend 3030 -> 80
backend  38080 -> 8080
mysql    127.0.0.1:33062 -> 3306
redis    127.0.0.1:16381 -> 6379
```

## Deploy Contract

Production deploy command:

```bash
npm run deploy
```

`npm run deploy:docker` is an alias for the same production command. Both run
`bash scripts/deploy-docker.sh`.

The deploy script must:

1. sync the current repository to `/var/www/project/hhdc_docker_prod`;
2. preserve `.env`, uploads, build output, logs and dependency directories;
3. verify that remote `.env` contains the production live container names and ports;
4. run `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`;
5. verify backend health and frontend HTTP status.

### Local Invocation

Config is loaded from `.deploy-docker.env` (or `$DEPLOY_DOCKER_CONFIG`); template at
`.deploy-docker.env.example`. Required/defaulted vars:

```text
DEPLOY_HOST=root@SERVER_IP        # required, no default — script fails without it
REMOTE_PATH=/var/www/project/hhdc_docker_prod   # required, must match exactly
BACKEND_PORT_PROD=38080           # default
FRONTEND_PORT_PROD=3030           # default
```

`REMOTE_PATH` is hard-checked against the live path above — the script refuses to run
against any other path, deliberately preventing a second production stack.

Flags: `--no-cache` (rebuild without Docker layer cache), `--skip-smoke` (skip the
post-deploy health/HTTP checks).

Runtime steps: `rsync -az --delete` (excludes `node_modules`, build output, `.env`,
uploads, `.git`) → asserts remote `.env` has the exact container names/ports listed
below → `docker compose up --build -d` → polls `GET /api/v1/health` on the backend
(up to 90s) → checks frontend root responds → dumps logs and fails loudly if health
never turns `"status":"ok"`.

The rsync source is the working directory, not the git tree, so the gitignored
`server/knowledge/` folder is delivered too. `docker-compose.prod.yml` mounts it read-only
into the backend at `/app/knowledge`; re-indexing after a deploy is a manual step, see
`docs/spec/DDC_RAG_V2_OPERATIONS.md` §6.

Deploy stays manual by design — see
`docs/adr/0002-manual-production-deploy-retire-github-actions-deploy.md`
(gitignored, local only) for the rationale.

## Nginx Contract

Host nginx terminates TLS with:

```text
/etc/nginx/sites-available/hhdc
```

The tracked template is:

```text
deploy/nginx/hhdc.conf
```

Required proxy targets:

```text
/       -> http://127.0.0.1:3030
/api    -> http://127.0.0.1:38080
/upload -> http://127.0.0.1:38080
```

## Compose Contract

```text
docker-compose.yml       # MySQL, Redis, shared volumes/network
docker-compose.prod.yml  # frontend nginx + backend Node production services
```

`docker-compose.dev.yml` is only for local development.

## Required Production Env

Remote `/var/www/project/hhdc_docker_prod/.env` must keep these production values:

```text
FRONTEND_CONTAINER_NAME=hhdc-client-live
BACKEND_CONTAINER_NAME=hhdc-backend-live
DB_CONTAINER_NAME=hhdc-mysql-live
REDIS_CONTAINER_NAME=hhdc-redis-live
FRONTEND_PORT_PROD=3030
BACKEND_PORT_PROD=38080
DB_PORT=33062
REDIS_PORT=16381
CLIENT_API_URL_PROD=https://hhdc.example.com
CLIENT_URL_PROD=https://hhdc.example.com
PUBLIC_SITE_URL_PROD=https://talentcenter.example.com
COOKIE_NAME=sid
COOKIE_NAME_MOLLIE=mollie_sid
```

Secrets remain only in `.env` files and are not committed.
