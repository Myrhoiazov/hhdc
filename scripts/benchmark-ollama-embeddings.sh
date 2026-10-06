#!/usr/bin/env bash
set -euo pipefail

ollama_url="${OLLAMA_URL:-http://127.0.0.1:11434}"
embedding_model="${OLLAMA_EMBEDDING_MODEL:-bge-m3}"
payload_file="$(mktemp)"
trap 'rm -f "$payload_file"' EXIT

printf '%s\n' '== before embeddings: memory =='
free -h

for case_name in nl en ua ru; do
    case "$case_name" in
        nl) text='Welke lessen biedt DDC aan?' ;;
        en) text='Which classes does DDC offer?' ;;
        ua) text='Які заняття пропонує DDC?' ;;
        ru) text='Какие занятия предлагает DDC?' ;;
    esac
    printf 'case=%s model=%s ' "$case_name" "$embedding_model"
    curl --fail-with-body --silent --show-error \
        --connect-timeout 5 --max-time 120 \
        --output "$payload_file" \
        --write-out 'http_status=%{http_code} total_seconds=%{time_total}\n' \
        -H 'Content-Type: application/json' \
        "${ollama_url%/}/api/embed" \
        --data "{\"model\":\"${embedding_model}\",\"input\":\"${text}\"}" \
        >/tmp/ddc-embedding-benchmark-status
    cat /tmp/ddc-embedding-benchmark-status
done

printf '%s\n' '== after embeddings: memory =='
free -h
printf '%s\n' 'Embedding responses were not printed; record RAM/CPU/latency for each language before choosing a model.'
