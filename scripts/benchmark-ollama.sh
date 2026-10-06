#!/usr/bin/env bash
set -euo pipefail

ollama_url="${OLLAMA_URL:-http://127.0.0.1:11434}"
ollama_model="${OLLAMA_MODEL:-qwen3:0.6b}"
context_length="${LLM_CONTEXT_LENGTH:-2048}"
temperature="${LLM_TEMPERATURE:-0.2}"
keep_alive="${LLM_KEEP_ALIVE:-0}"

printf '%s\n' '== before inference: memory =='
free -h

printf '%s\n' '== before inference: containers =='
if command -v docker >/dev/null 2>&1; then
    docker stats --no-stream || true
else
    printf '%s\n' 'docker unavailable; skipping container stats'
fi

response_file="$(mktemp)"
metrics_file="$(mktemp)"
trap 'rm -f "$response_file" "$metrics_file" "${response_file}.status"' EXIT

printf '== inference: model=%s url=%s context=%s temperature=%s keep_alive=%s ==\n' \
    "$ollama_model" "$ollama_url" "$context_length" "$temperature" "$keep_alive"

curl --fail-with-body --silent --show-error \
    --output "$response_file" \
    --write-out 'http_status=%{http_code} total_seconds=%{time_total}\n' \
    --connect-timeout 5 --max-time 120 \
    -H 'Content-Type: application/json' \
    "${ollama_url%/}/api/generate" \
    --data "{\"model\":\"${ollama_model}\",\"prompt\":\"Respond with the single word OK.\",\"stream\":false,\"keep_alive\":${keep_alive},\"options\":{\"num_ctx\":${context_length},\"temperature\":${temperature}}}" \
    >"${response_file}.status" 2>&1 &
curl_pid=$!

while kill -0 "$curl_pid" 2>/dev/null; do
    {
        date '+timestamp=%Y-%m-%dT%H:%M:%S%z'
        free -h
        if command -v docker >/dev/null 2>&1; then
            docker stats --no-stream || true
        fi
        printf '%s\n' '---'
    } >> "$metrics_file"
    sleep 1
done
set +e
wait "$curl_pid"
curl_exit=$?
set -e

cat "${response_file}.status"
printf '%s\n' '== during inference resource samples =='
cat "$metrics_file"

printf '%s\n' '== after inference: memory =='
free -h

printf '%s\n' '== after inference: containers =='
if command -v docker >/dev/null 2>&1; then
    docker stats --no-stream || true
fi

printf '%s\n' 'Response body was stored temporarily and was not printed.'
exit "$curl_exit"
