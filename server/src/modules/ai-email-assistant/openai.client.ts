import { aiConfig, DEFAULT_OPENAI_CONTEXT_LENGTH, type AiConfig } from '../../config/ai.config';
import { DEFAULT_PROMPT_CONTENT, PrismaAiPromptRepository, type AiPromptRepository } from './prompt-library.service';
import { buildDeterministicDraft, buildDraftBodyPrompt } from './ollama.client';
import { emailDraftSchema, type DraftContext, type EmailDraft } from './draft.service';
import { DRAFT_PROVIDERS, DraftProviderError, type DraftProvider, type LlmCallMetric } from './draft-provider';

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}
export interface OpenAiClientOptions { config?: AiConfig; fetchImpl?: typeof fetch; promptRepository?: AiPromptRepository; model?: string; onMetric?: (metric: LlmCallMetric) => void; }

export class OpenAiDraftClient implements DraftProvider {
  public readonly provider = DRAFT_PROVIDERS.OPENAI;
  public readonly model: string;
  public readonly contextLength: number;
  private readonly config: AiConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly prompts: AiPromptRepository;
  private readonly onMetric?: (metric: LlmCallMetric) => void;
  public constructor(options: OpenAiClientOptions = {}) {
    this.config = options.config ?? aiConfig;
    this.model = options.model ?? this.config.openAiDefaultModel ?? this.config.ollamaModel;
    this.contextLength = this.config.openAiContextLength ?? DEFAULT_OPENAI_CONTEXT_LENGTH;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.prompts = options.promptRepository ?? new PrismaAiPromptRepository();
    this.onMetric = options.onMetric;
  }
  public async generateDraft(context: DraftContext): Promise<EmailDraft> {
    if (!this.config.openAiApiKey) throw new DraftProviderError('PROVIDER_NOT_CONFIGURED', 'OpenAI is not configured');
    const instructions = await this.prompts.getActiveContent('DRAFT_BODY').catch(() => DEFAULT_PROMPT_CONTENT.DRAFT_BODY);
    const baseUrl = (this.config.openAiBaseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    let response: Response;
    const start = Date.now();
    try {
      response = await this.fetchImpl(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.openAiApiKey}` }, body: JSON.stringify({ model: this.model, temperature: this.config.temperature, messages: [{ role: 'system', content: instructions }, { role: 'user', content: buildDraftBodyPrompt(instructions, context) }] }) });
    } catch (error) {
      throw new DraftProviderError('UNAVAILABLE', error instanceof Error ? error.message : 'OpenAI unavailable');
    }
    const durationMs = Date.now() - start;
    if (response.status === 408 || response.status === 504) throw new DraftProviderError('TIMEOUT', 'OpenAI request timed out');
    if (response.status === 429) throw new DraftProviderError('RATE_LIMITED', 'OpenAI rate limit reached');
    if (!response.ok) throw new DraftProviderError('UNAVAILABLE', `OpenAI request failed with HTTP ${response.status}`);
    let parsed: OpenAiResponse;
    try { parsed = await response.json() as OpenAiResponse; } catch { throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI response was not valid JSON'); }
    const content = parsed.choices?.[0]?.message?.content;
    const body = content?.trim().slice(0, 6000) ?? '';
    if (body.length < 5) throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI returned an empty draft');
    this.onMetric?.({
      durationMs, callCount: 1,
      promptTokens: parsed.usage?.prompt_tokens, completionTokens: parsed.usage?.completion_tokens, totalTokens: parsed.usage?.total_tokens,
    });
    try { return emailDraftSchema.parse(JSON.parse(body)); } catch { return buildDeterministicDraft(context, body); }
  }
}
