const TIMEOUT_MS = 60_000;

export interface JsonRequest { url: string; body: unknown; headers?: Record<string, string>; fetchImpl: typeof fetch; label: string }

// Shared JSON POST for AI adapters: bounded by a timeout, and provider error bodies are
// never surfaced (they can echo prompts that contain personal data).
export const postJson = async ({ url, body, headers, fetchImpl, label }: JsonRequest): Promise<unknown> => {
    const response = await fetchImpl(url, {
        method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
    return response.json();
};

export const JSON_ONLY_INSTRUCTION = 'Respond with a single valid JSON object and nothing else.';

export const parseStructured = <T,>(raw: string, schema: { parse: (value: unknown) => T }): T => schema.parse(JSON.parse(raw));
