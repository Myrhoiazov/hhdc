import { z } from 'zod';
import type { Request, Response } from 'express';
import { createPrismaAiRuntimeSettingsRepository } from './runtime-settings.service';
import { createDraftProviderFactory } from './draft-provider.factory';
import { DraftProviderError } from './draft-provider';
import { DRAFT_PROVIDERS } from './draft-provider';

const repository = createPrismaAiRuntimeSettingsRepository();
export const updateRuntimeSettingsSchema = z.object({ provider: z.enum([DRAFT_PROVIDERS.OLLAMA, DRAFT_PROVIDERS.OPENAI]), model: z.string().trim().min(1).max(191) }).strict();
export const getRuntimeSettings = async (_req: Request, res: Response) => res.json(await repository.get());
export const updateRuntimeSettings = async (req: Request, res: Response) => {
  const parsed = updateRuntimeSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid AI provider settings' });
  try { return res.json(await repository.update({ provider: parsed.data.provider, model: parsed.data.model, updatedById: req.user?.id })); }
  catch (error) { if (error instanceof Error && error.message === 'MODEL_NOT_ALLOWED') return res.status(400).json({ message: 'Model is not allowed' }); throw error; }
};
export const testRuntimeSettings = async (_req: Request, res: Response) => {
  try { return res.json({ ok: true, ...(await createDraftProviderFactory(repository).testSelectedProvider()) }); }
  catch (error) { const code = error instanceof DraftProviderError ? error.code : 'UNAVAILABLE'; return res.status(503).json({ ok: false, errorCode: code }); }
};
