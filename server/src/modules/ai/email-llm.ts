import type { AiProvider } from '../../integrations/ai/provider';
import { buildReplySubject } from '../communications/send';
import { emailClassificationSchema, type EmailClassification, type LlmClient, type NormalizedEmailInput } from './email-classification';
import { emailDraftSchema, type DraftContext, type DraftLlmClient, type EmailDraft } from './email-draft.types';
import { buildRagV2Prompt } from './rag-v2/context-builder';

// Below this retrieval score a draft is not considered answerable without a human look.
const CONFIDENT_KNOWLEDGE_SCORE = 0.55;
const MIN_DRAFT_BODY_CHARS = 5;
const MAX_DRAFT_BODY_CHARS = 6_000;

const LANGUAGE_NAMES: Record<EmailClassification['replyLanguage'], string> = {
    nl: 'Dutch', en: 'English', uk: 'Ukrainian', ru: 'Russian', unknown: 'the language of the customer email',
};

export const buildClassificationPrompt = (instructions: string, input: NormalizedEmailInput): string => [
    instructions,
    `FROM: ${input.fromAddress}`,
    `SUBJECT: ${input.subject}`,
    `BODY: ${input.normalizedBody}`,
].join('\n');

const buildFlatDraftBodyPrompt = (persona: string, context: DraftContext): string => [
    persona,
    '',
    `CUSTOMER EMAIL: ${context.email.normalizedBody}`,
    context.knowledge.length ? `KNOWLEDGE:\n${context.knowledge.map(chunk => `- ${chunk.content}`).join('\n')}` : 'KNOWLEDGE: (nothing found)',
].join('\n');

const buildRagV2DraftPrompt = (persona: string, context: DraftContext, ragV2: NonNullable<DraftContext['ragV2']>): string => {
    const built = buildRagV2Prompt({
        persona, understanding: ragV2.understanding, knowledge: ragV2.knowledge,
        customerMessage: context.email.normalizedBody,
        emailThread: context.email.thread,
        crmData: ragV2.crmData,
        correction: ragV2.correction, characterBudget: ragV2.characterBudget,
    });
    ragV2.onPromptBuilt?.(built);
    return built.prompt;
};

const EVENT_TIME_ZONE = 'Europe/Amsterdam';
const CURRENT_DATE_PLACEHOLDER = '{{current_date}}';

// "Wednesday, 7 October 2026 (2026-10-07)" in the event's time zone: readable for the model and
// unambiguous for "is the early bird still on", "how long until the camp" and similar questions.
export const formatCurrentDate = (now: Date): string => {
    const long = new Intl.DateTimeFormat('en-GB', { timeZone: EVENT_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    const iso = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE }).format(now);
    return `${long} (${iso})`;
};

// A saved prompt places the date with {{current_date}}; one written without the placeholder
// still gets it, because a model that does not know today's date guesses it.
const withCurrentDate = (instructions: string, now: Date): string => {
    const date = formatCurrentDate(now);
    return instructions.includes(CURRENT_DATE_PLACEHOLDER)
        ? instructions.split(CURRENT_DATE_PLACEHOLDER).join(date)
        : `${instructions}\nToday is ${date}.`;
};

export const buildDraftBodyPrompt = (instructions: string, context: DraftContext, now: Date = new Date()): string => {
    const persona = withCurrentDate(instructions, now).split('{{replyLanguage}}').join(LANGUAGE_NAMES[context.classification.replyLanguage]);
    return context.ragV2 ? buildRagV2DraftPrompt(persona, context, context.ragV2) : buildFlatDraftBodyPrompt(persona, context);
};

// Only the reply body comes from the model; every other field is computed from data the
// pipeline already has, which a small model cannot get wrong.
export const buildDeterministicDraft = (context: DraftContext, body: string): EmailDraft => {
    const topScore = context.knowledge[0]?.score ?? 0;
    return emailDraftSchema.parse({
        replyLanguage: context.classification.replyLanguage,
        subject: buildReplySubject(context.email.subject || '(No subject)'),
        body,
        confidence: Math.max(0, Math.min(context.classification.confidence, topScore || context.classification.confidence)),
        needsManualAnswer: context.knowledge.length === 0 || topScore < CONFIDENT_KNOWLEDGE_SCORE,
        usedKnowledgeIds: context.knowledge.map(chunk => chunk.id).slice(0, 20),
    });
};

export interface EmailLlmOptions {
    provider: AiProvider;
    prompts: { classification: string; draftBody: string };
    contextLength: number;
}

export type EmailLlm = LlmClient & DraftLlmClient & { readonly model: string };

const classify = (options: EmailLlmOptions, input: NormalizedEmailInput): Promise<EmailClassification> =>
    options.provider.generateStructured<EmailClassification>(buildClassificationPrompt(options.prompts.classification, input), { schema: emailClassificationSchema });

const draft = async (options: EmailLlmOptions, context: DraftContext): Promise<EmailDraft> => {
    const body = (await options.provider.generateText(buildDraftBodyPrompt(options.prompts.draftBody, context))).trim().slice(0, MAX_DRAFT_BODY_CHARS);
    if (body.length < MIN_DRAFT_BODY_CHARS) throw new Error('AI provider returned an empty draft');
    return buildDeterministicDraft(context, body);
};

// The email assistant's view of a configured AI provider (OpenAI or Ollama alike).
export const createEmailLlm = (options: EmailLlmOptions): EmailLlm => ({
    model: options.provider.model,
    contextLength: options.contextLength,
    classifyEmail: input => classify(options, input),
    generateDraft: context => draft(options, context),
});
