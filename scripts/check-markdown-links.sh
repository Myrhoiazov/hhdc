#!/usr/bin/env bash
# Проверяет все отслеживаемые Markdown-файлы репозитория на битые ссылки.
# Используется и в CI job'e docs-links, и локально через `npm run docs:links`.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.github/markdown-link-check-config.json"

FILES=()
while IFS= read -r file; do
    FILES+=("$file")
done < <(find "$ROOT_DIR" -iname "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/graphify-out/*" \
    -not -path "*/docs/roadmap/*" \
    -not -path "*/docs/security/*" \
    -not -path "*/docs/adr/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" \
    | sort)

if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "Markdown-файлы не найдены"
    exit 0
fi

echo "Проверяем ${#FILES[@]} markdown-файл(ов) на битые ссылки..."

FAILED=0
for file in "${FILES[@]}"; do
    echo "==> ${file#"$ROOT_DIR"/}"
    if ! npx --yes markdown-link-check --config "$CONFIG_FILE" --quiet "$file"; then
        FAILED=1
    fi
done

exit "$FAILED"
