# HHDC Admin

HHDC Admin is an internal administration platform for High Heels Dance Camp. It is built for event clients and contacts, communications, payments, content, users, roles, and settings.

The project is a TypeScript monorepo:

| Layer | Technology |
|---|---|
| Client | React 19, Redux Toolkit, TypeScript, SCSS Modules, Webpack |
| Server | Express 5, Prisma 6, MySQL 8, Zod |
| E2E | Playwright with an isolated MySQL database |
| Infrastructure | Docker Compose and nginx |

The product is an event admin workspace, not a dance-school CRM. Existing legacy modules may still contain inherited names while the domain is being migrated.

## Repository layout

```text
client/  React admin SPA using Feature-Sliced Design
server/  Express API, Prisma schema, and MySQL access
docker/  Development and production images and nginx config
e2e/     Playwright setup and browser flows
plugins/ Local ESLint plugins
scripts/ Repository tooling
```

Install dependencies separately in `client/` and `server/` when working outside Docker. The supported development path is Docker Compose.

## Getting started

Prerequisites: Docker with Compose v2 and Node.js 20+ for repository tooling.

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The local stack runs MySQL, Redis, the API, and the frontend using the ports configured in `.env`. To reset local database state after changing credentials or schema configuration:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

This removes local volumes and the next startup initializes a clean database. Do not use the development database for E2E runs.

## Commands

From the repository root:

```bash
npm start              # start the client and server without Docker
npm run ci             # client checks, server checks, build, and Markdown links
npm run e2e             # reset the isolated E2E database and run Playwright
npm run e2e:ui          # open Playwright UI mode
npm run e2e:down        # remove the isolated E2E database and volume
npm run docs:links      # check Markdown links
npm run graphify:specs  # refresh Graphify context artifacts
npm run deploy          # deploy the Docker Compose production stack
```

Client commands (`cd client`):

```bash
npm start
npm run build:prod
npm run lint:ts
npm run lint:scss
npm test
```

Server commands (`cd server`):

```bash
npm start
npm run build
npm run prisma:generate
npm run pmd:dev
npm run test:auth
npm run test:email
npm run test:search
npm run test:ci
```

## Architecture

The client follows Feature-Sliced Design:

```text
app -> pages -> widgets -> features -> entities -> shared
```

The server uses feature modules:

```text
modules/<name>/<name>.routes.ts -> <name>.controller.ts -> <name>.service.ts
```

Use [CONTEXT.md](CONTEXT.md) for product terminology, [AGENTS.md](AGENTS.md) for execution rules, and [.claude/rules/code-style.md](.claude/rules/code-style.md) for UI tokens and theme conventions.

## Environment

The documented environment contract is [`.env.example`](.env.example). It includes database, Redis, ports, URLs, security, email, payment-provider, Telegram, and optional local AI settings. Keep secrets in local environment files only.

## Documentation

- [Agent instructions](AGENTS.md)
- [Project context](CONTEXT.md)
- [Graphify workflow](docs/spec/GRAPHIFY_WORKFLOW.md)

Task plans are local working material and are not product truth.

## License

No license file is included in this repository. All rights to the code are reserved by the copyright holder.
