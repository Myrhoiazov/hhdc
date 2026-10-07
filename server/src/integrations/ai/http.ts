const DEFAULT_TIMEOUT_MS = 60_000;

// A local model on CPU can need minutes for a long prompt; AI_REQUEST_TIMEOUT_MS raises the bound.
export const requestTimeoutMs = (env: NodeJS.ProcessEnv = process.env): number => {
    const configured = Number(env.AI_REQUEST_TIMEOUT_MS);
    return Number.isInteger(configured) && configured >= 1_000 ? configured : DEFAULT_TIMEOUT_MS;
};

export interface JsonRequest { url: string; body: unknown; headers?: Record<string, string>; fetchImpl: typeof fetch; label: string }

// Shared JSON POST for AI adapters: bounded by a timeout, and provider error bodies are
// never surfaced (they can echo prompts that contain personal data).
export const postJson = async ({ url, body, headers, fetchImpl, label }: JsonRequest): Promise<unknown> => {
    const response = await fetchImpl(url, {
        method: 'POST', signal: AbortSignal.timeout(requestTimeoutMs()),
        headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
    return response.json();
};

export const JSON_ONLY_INSTRUCTION = 'Respond with a single valid JSON object and nothing else.';

export const parseStructured = <T,>(raw: string, schema: { parse: (value: unknown) => T }): T => schema.parse(JSON.parse(raw));
