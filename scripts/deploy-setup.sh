#!/usr/bin/env bash
# One-time preparation of a production server for the Docker stack. Every step is safe to
# repeat: an existing remote .env and an existing nginx site are left as they are.
#
# Usage:
#   ./scripts/deploy-setup.sh env     # create the remote .env with secrets generated on the server
#   ./scripts/deploy-setup.sh nginx   # install the host nginx site and issue the TLS certificate
#   ./scripts/deploy-setup.sh owner   # create the first OWNER account (after the first deploy)
# Config comes from .deploy-docker.env (see .deploy-docker.env.example), or env vars.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEPLOY_DOCKER_CONFIG:-$ROOT_DIR/.deploy-docker.env}"
NGINX_TEMPLATE="$ROOT_DIR/docker/nginx/host-site.conf.template"
NGINX_SITE_NAME="hhdc"

if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/project/hhdc}"
BACKEND_PORT="${BACKEND_PORT_PROD:-38090}"
FRONTEND_PORT="${FRONTEND_PORT_PROD:-3040}"

usage() {
    echo "Использование: ./scripts/deploy-setup.sh env|nginx|owner"
}

require_config() {
    if [[ -z "$DEPLOY_HOST" ]]; then
        echo "Укажите DEPLOY_HOST в .deploy-docker.env (см. .deploy-docker.env.example)."
        exit 1
    fi
    if [[ ! "$DEPLOY_DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
        echo "Укажите DEPLOY_DOMAIN в .deploy-docker.env, например hhdc.example.com."
        exit 1
    fi
}

# Secrets never leave the server: they are generated there and written to a 0600 file.
create_remote_env() {
    ssh "$DEPLOY_HOST" bash -s -- "$REMOTE_PATH" "$DEPLOY_DOMAIN" "$FRONTEND_PORT" "$BACKEND_PORT" <<'REMOTE_SCRIPT'
set -Eeuo pipefail
REMOTE_PATH="$1"
DOMAIN="$2"
FRONTEND_PORT="$3"
BACKEND_PORT="$4"

mkdir -p "$REMOTE_PATH"
cd "$REMOTE_PATH"

if [[ -f .env ]]; then
    echo "$REMOTE_PATH/.env уже существует — оставляем без изменений."
    exit 0
fi

umask 077
cat > .env <<ENV_FILE
# Production environment of the HHDC Admin Docker stack. Created by scripts/deploy-setup.sh.

# --- Stack layout (checked by scripts/deploy-docker.sh before every deploy) ---
FRONTEND_CONTAINER_NAME=hhdc-client-live
BACKEND_CONTAINER_NAME=hhdc-backend-live
POSTGRES_CONTAINER_NAME=hhdc-postgres
REDIS_CONTAINER_NAME=hhdc-redis
FRONTEND_PORT_PROD=$FRONTEND_PORT
BACKEND_PORT_PROD=$BACKEND_PORT
POSTGRES_PORT=55433
REDIS_PORT=16391

# --- Public address ---
CLIENT_URL_PROD=https://$DOMAIN
CLIENT_API_URL_PROD=https://$DOMAIN

# --- Database and cache ---
POSTGRES_DB=hhdc_crm
POSTGRES_USER=hhdc
POSTGRES_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)

# --- Application secrets. Changing APP_ENCRYPTION_KEY makes saved provider credentials unreadable. ---
SESSION_SECRET=$(openssl rand -hex 48)
APP_ENCRYPTION_KEY=$(openssl rand -base64 32)

# --- Integrations: uncomment and fill what is used, then redeploy ---
# GMAIL_CLIENT_ID=
# GMAIL_CLIENT_SECRET=
# GMAIL_REDIRECT_URI=https://$DOMAIN/api/v1/providers/gmail/callback
# WEEZTIX_CLIENT_ID=
# WEEZTIX_CLIENT_SECRET=
# WEEZTIX_REDIRECT_URI=
# TELEGRAM_TOKEN=
# TELEGRAM_EMAIL_NOTIFY_CHAT_ID=
# TELEGRAM_APPROVERS=
# OLLAMA_URL=http://host.docker.internal:11434
ENV_FILE

echo "Создан $REMOTE_PATH/.env (права 600). Секреты сгенерированы на сервере."
REMOTE_SCRIPT
}

render_nginx_site() {
    sed \
        -e "s/__DOMAIN__/$DEPLOY_DOMAIN/g" \
        -e "s/__BACKEND_PORT__/$BACKEND_PORT/g" \
        -e "s/__FRONTEND_PORT__/$FRONTEND_PORT/g" \
        "$NGINX_TEMPLATE"
}

# The installed site is never overwritten: certbot keeps its TLS settings in that same file.
install_nginx_site() {
    # mktemp creates the file itself (0600, unpredictable name), so nobody on the server can
    # plant a file or a symlink at the path before root writes to it.
    local upload_path
    upload_path="$(ssh "$DEPLOY_HOST" "mktemp /tmp/$NGINX_SITE_NAME-nginx-site.XXXXXXXX")"
    render_nginx_site | ssh "$DEPLOY_HOST" "cat > '$upload_path'"
    ssh "$DEPLOY_HOST" bash -s -- "$upload_path" "$NGINX_SITE_NAME" "$DEPLOY_DOMAIN" <<'REMOTE_SCRIPT'
set -Eeuo pipefail
UPLOAD_PATH="$1"
SITE_NAME="$2"
DOMAIN="$3"
SITE="/etc/nginx/sites-available/$SITE_NAME"

if [[ -f "$SITE" ]]; then
    echo "$SITE уже существует — оставляем без изменений."
else
    install -m 644 "$UPLOAD_PATH" "$SITE"
    echo "Установлен $SITE"
fi
rm -f "$UPLOAD_PATH"

ln -sfn "$SITE" "/etc/nginx/sites-enabled/$SITE_NAME"
nginx -t
systemctl reload nginx

echo "==> Выпускаем TLS-сертификат для $DOMAIN"
certbot --nginx -d "$DOMAIN" --redirect --non-interactive
REMOTE_SCRIPT
}

read_owner_credentials() {
    read -r -p "Email владельца: " OWNER_EMAIL
    read -r -s -p "Пароль владельца (не короче 12 символов): " OWNER_PASSWORD
    echo
    if [[ -z "$OWNER_EMAIL" || "${#OWNER_PASSWORD}" -lt 12 ]]; then
        echo "Нужен email и пароль не короче 12 символов."
        exit 1
    fi
}

# Credentials travel over the SSH channel on stdin, so they never appear in a process list.
seed_owner() {
    read_owner_credentials
    printf '%s\n%s\n' "$OWNER_EMAIL" "$OWNER_PASSWORD" | ssh "$DEPLOY_HOST" bash -c "'
        set -Eeuo pipefail
        cd \"$REMOTE_PATH\"
        IFS= read -r SEED_OWNER_EMAIL
        IFS= read -r SEED_OWNER_PASSWORD
        export SEED_OWNER_EMAIL SEED_OWNER_PASSWORD
        docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T \
            -e SEED_OWNER_EMAIL -e SEED_OWNER_PASSWORD backend node build/prisma/seed.js </dev/null
    '"
    echo "Владелец $OWNER_EMAIL создан (или уже существовал)."
}

main() {
    local step="${1:-}"
    case "$step" in
        env)
            require_config
            create_remote_env
            ;;
        nginx)
            require_config
            install_nginx_site
            ;;
        owner)
            require_config
            seed_owner
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
