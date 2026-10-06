import { OllamaLlmClient } from './ollama.client';
import { OpenAiDraftClient } from './openai.client';
import { DRAFT_PROVIDERS, type DraftProvider, type LlmCallMetric } from './draft-provider';
import { createPrismaAiRuntimeSettingsRepository, type AiRuntimeSettingsRepository, type AiRuntimeSettings } from './runtime-settings.service';

export const createDraftProviderFactory = (settingsRepository: AiRuntimeSettingsRepository = createPrismaAiRuntimeSettingsRepository()) => ({
  async getSelectedProvider(onMetric?: (metric: LlmCallMetric) => void): Promise<DraftProvider> {
    const settings = await settingsRepository.get();
    return settings.provider === DRAFT_PROVIDERS.OPENAI
      ? new OpenAiDraftClient({ model: settings.model, onMetric })
      : new OllamaLlmClient({ onMetric });
  },
  async testSelectedProvider(): Promise<{ provider: AiRuntimeSettings['provider']; model: string }> {
    const settings = await settingsRepository.get();
    const provider = await this.getSelectedProvider();
    await provider.generateDraft({ email: { fromAddress: 'synthetic@example.com', subject: 'Synthetic test', normalizedBody: 'Synthetic provider connectivity test.' }, classification: { spam: false, needsReply: true, language: 'en', intent: 'other', confidence: 1, reason: 'synthetic' }, contact: null, knowledge: [] });
    return { provider: settings.provider, model: settings.model };
  },
});
