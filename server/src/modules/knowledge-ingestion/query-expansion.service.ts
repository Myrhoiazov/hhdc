import { aiConfig, type AiConfig } from '../../config/ai.config';

export interface QueryExpansion {
    cleanQuery: string;
    keywords: string[];
}

export interface QueryExpansionClient {
    expand(query: string): Promise<QueryExpansion>;
}

const stripCodeFence = (raw: string): string => raw
    .replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```[\s\S]*$/i, '')
    .trim();

// Extracts the first balanced JSON object `{...}` from a string with brace-depth tracking,
// ignoring braces inside JSON strings — handles a model that wraps its JSON in explanatory prose.
const extractJsonObject = (text: string): string | null => {
    const start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{') depth += 1;
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) return text.slice(start, index + 1);
        }
    }
    return null;
};

// Code-fence stripping → direct JSON.parse → balanced-brace extraction, mirroring the fallback
// chain parseExpansionResponse relies on below. Returns null only when every strategy fails.
const parseExpansionJson = (raw: string, trimmed: string): Record<string, unknown> | null => {
    try {
        return JSON.parse(trimmed);
    } catch {
        const stripped = stripCodeFence(raw);
        if (stripped !== trimmed) {
            try { return JSON.parse(stripped); } catch { /* fall through to extraction */ }
        }
        const extracted = extractJsonObject(trimmed);
        if (!extracted) return null;
        try { return JSON.parse(extracted); } catch { return null; }
    }
};

const extractKeywords = (rawKeywords: unknown): string[] => {
    if (Array.isArray(rawKeywords)) return rawKeywords.map((keyword) => String(keyword).trim()).filter(Boolean);
    if (typeof rawKeywords === 'string') return rawKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean);
    return [];
};

// Pure parser, ported from the rag/ reference project's src/queryExpansion.ts, ignoring its
// `format: "json"` request option: this exact deployment already found (tasks/plan.md Task 24)
// that `format: "json"` makes qwen3 reliably return an empty `{}` for both classification and
// drafting — the same robust plain-text extraction this project already relies on for those
// (code-fence stripping → direct JSON.parse → balanced-brace extraction) is used here instead,
// handling both valid JSON and JSON embedded in surrounding explanatory text.
export const parseExpansionResponse = (raw: string): QueryExpansion | null => {
    if (!raw || !raw.trim()) return null;
    const trimmed = raw.trim();
    const parsed = parseExpansionJson(raw, trimmed);
    if (!parsed || typeof parsed !== 'object') return null;

    const cleanQuery = String((parsed as { clean_query?: unknown }).clean_query ?? '').trim();
    const keywords = extractKeywords((parsed as { keywords?: unknown }).keywords);

    if (!cleanQuery && !keywords.length) return null;
    return { cleanQuery, keywords };
};

// Same portable Latin+Cyrillic tokenization as bm25.service.ts — no `\p{L}`/`u`-flag Unicode
// property escapes (rejected by this project's ts-node runtime target, see the tsc-vs-ts-node
// project memory), and this deployment's content is Russian/Ukrainian/Dutch/English, not
// Unicode-general.
const fallbackKeywords = (query: string): string[] => query
    .toLowerCase()
    .replace(/[^a-z0-9а-яёіїєґ_]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 6);

const buildExpansionPrompt = (query: string) => [
    'You return JSON only. Do not add explanation outside JSON.',
    'You are a query expansion assistant for a knowledge-base search. Given a user query, produce:',
    '1. "clean_query" - a concise keyword-phrase version of the query, in the SAME language as the query (never translate it).',
    '2. "keywords" - a list of 3-6 important keywords, names, prices, or terms from the query, in the SAME language as the query.',
    'Return ONLY valid JSON in this exact format:',
    '{"clean_query": "...", "keywords": ["...", "..."]}',
    '',
    `User query: ${query}`,
].join('\n');

const ollamaResponseText = (value: unknown): string => {
    if (!value || typeof value !== 'object' || typeof (value as { response?: unknown }).response !== 'string') {
        throw new Error('Ollama response did not contain a text response');
    }
    return (value as { response: string }).response;
};

export interface QueryExpansionMetric {
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

const extractOllamaTokenUsage = (value: unknown): { promptTokens?: number; completionTokens?: number } => {
    if (!value || typeof value !== 'object') return {};
    const body = value as { prompt_eval_count?: unknown; eval_count?: unknown };
    return {
        promptTokens: typeof body.prompt_eval_count === 'number' ? body.prompt_eval_count : undefined,
        completionTokens: typeof body.eval_count === 'number' ? body.eval_count : undefined,
    };
};

export interface OllamaQueryExpansionClientOptions {
    config?: AiConfig;
    fetchImpl?: typeof fetch;
    onMetric?: (metric: QueryExpansionMetric) => void;
}

// Every failure mode (network error, non-2xx, unparseable output) falls back to the original
// query plus locally-extracted keywords rather than throwing — query expansion is a best-effort
// quality improvement, never a hard dependency of retrieval.
export class OllamaQueryExpansionClient implements QueryExpansionClient {
    private readonly config: AiConfig;
    private readonly fetchImpl: typeof fetch;
    private readonly onMetric?: (metric: QueryExpansionMetric) => void;

    public constructor(options: OllamaQueryExpansionClientOptions = {}) {
        this.config = options.config ?? aiConfig;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.onMetric = options.onMetric;
    }

    public async expand(query: string): Promise<QueryExpansion> {
        const start = Date.now();
        try {
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt: buildExpansionPrompt(query),
                    stream: false,
                    keep_alive: this.config.keepAlive,
                    options: { num_ctx: this.config.contextLength, temperature: 0.1 },
                }),
            });
            const durationMs = Date.now() - start;
            if (!response.ok) {
                return { cleanQuery: query, keywords: fallbackKeywords(query) };
            }
            const parsedBody = await response.json();
            const raw = ollamaResponseText(parsedBody);
            const usage = extractOllamaTokenUsage(parsedBody);
            this.onMetric?.({
                durationMs,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: (usage.promptTokens || usage.completionTokens) ? (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0) : undefined,
            });
            const parsed = parseExpansionResponse(raw);
            if (!parsed) return { cleanQuery: query, keywords: fallbackKeywords(query) };
            return {
                cleanQuery: parsed.cleanQuery || query,
                keywords: parsed.keywords.length ? parsed.keywords : fallbackKeywords(query),
            };
        } catch {
            return { cleanQuery: query, keywords: fallbackKeywords(query) };
        }
    }
}
