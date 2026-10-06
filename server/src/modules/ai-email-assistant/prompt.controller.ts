import { AiPromptSlot } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaAiPromptRepository } from './prompt-library.service';

const repository = new PrismaAiPromptRepository();

const tagsField = z.union([z.array(z.string()), z.string()]).optional().transform((value) => {
    if (!value) return [] as string[];
    const list = Array.isArray(value) ? value : value.split(',');
    return list.map((tag) => tag.trim()).filter(Boolean);
});

export const createPromptSchema = z.object({
    slot: z.nativeEnum(AiPromptSlot),
    name: z.string().trim().min(1).max(191),
    content: z.string().trim().min(1).max(20_000),
    tags: tagsField,
});

export const updatePromptSchema = z.object({
    name: z.string().trim().min(1).max(191).optional(),
    content: z.string().trim().min(1).max(20_000).optional(),
    tags: tagsField,
});

export const listPrompts = async (req: Request, res: Response) => {
    const slot = typeof req.query.slot === 'string' && req.query.slot in AiPromptSlot ? req.query.slot as AiPromptSlot : undefined;
    return res.json(await repository.list(slot));
};

export const createPrompt = async (req: Request, res: Response) => {
    const parsed = createPromptSchema.safeParse(req.body);
    if (parsed.success === true) {
        const { slot, name, content, tags } = parsed.data;
        return res.status(201).json(await repository.create({ slot, name, content, tags }));
    }
    return res.status(400).json({ message: 'Проверьте слот/название/текст промпта', details: parsed.error.flatten() });
};

export const updatePrompt = async (req: Request, res: Response) => {
    const parsed = updatePromptSchema.safeParse(req.body);
    if (parsed.success === true) {
        const { name, content, tags } = parsed.data;
        const update = { ...(name ? { name } : {}), ...(content ? { content } : {}), ...(tags.length || req.body.tags !== undefined ? { tags } : {}) };
        return res.json(await repository.update(Number(req.params.id), update));
    }
    return res.status(400).json({ message: 'Проверьте название/текст/теги промпта', details: parsed.error.flatten() });
};

export const activatePrompt = async (req: Request, res: Response) => {
    try {
        return res.json(await repository.activate(Number(req.params.id)));
    } catch (error) {
        return res.status(404).json({ message: error instanceof Error ? error.message : 'Промпт не найден' });
    }
};

export const deletePrompt = async (req: Request, res: Response) => {
    await repository.remove(Number(req.params.id));
    return res.status(204).send();
};
