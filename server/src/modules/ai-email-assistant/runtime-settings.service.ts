import prisma from '../../../prisma/prisma-client';
import { aiConfig } from '../../config/ai.config';
import { DRAFT_PROVIDERS, type DraftProviderName } from './draft-provider';

export interface AiRuntimeSettings { provider: DraftProviderName; model: string; updatedAt: Date; }
export interface AiRuntimeSettingsRepository {
  get(): Promise<AiRuntimeSettings>;
  update(input: { provider: DraftProviderName; model: string; updatedById?: number }): Promise<AiRuntimeSettings>;
}

const defaultModel = (provider: DraftProviderName) => provider === DRAFT_PROVIDERS.OPENAI ? (aiConfig.openAiDefaultModel ?? aiConfig.ollamaModel) : aiConfig.ollamaModel;
export const validateDraftModel = (provider: DraftProviderName, model: string): string => {
  const normalized = model.trim();
  if (!normalized) throw new Error('MODEL_REQUIRED');
  if (provider === DRAFT_PROVIDERS.OPENAI && aiConfig.openAiAllowedModels?.length && !aiConfig.openAiAllowedModels.includes(normalized)) throw new Error('MODEL_NOT_ALLOWED');
  return normalized;
};

export const createPrismaAiRuntimeSettingsRepository = (): AiRuntimeSettingsRepository => ({
  async get() {
    const row = await prisma.aiRuntimeSettings.upsert({ where: { id: 1 }, create: { id: 1, draftProvider: DRAFT_PROVIDERS.OLLAMA, draftModel: defaultModel(DRAFT_PROVIDERS.OLLAMA) }, update: {} });
    return { provider: row.draftProvider, model: row.draftModel, updatedAt: row.updatedAt };
  },
  async update(input) {
    const model = validateDraftModel(input.provider, input.model);
    const row = await prisma.aiRuntimeSettings.upsert({ where: { id: 1 }, create: { id: 1, draftProvider: input.provider, draftModel: model, updatedById: input.updatedById }, update: { draftProvider: input.provider, draftModel: model, updatedById: input.updatedById } });
    return { provider: row.draftProvider, model: row.draftModel, updatedAt: row.updatedAt };
  },
});
