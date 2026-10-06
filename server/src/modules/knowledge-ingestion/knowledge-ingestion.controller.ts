import { KnowledgeCategory, KnowledgeDocumentStatus } from '@prisma/client';
import fs from 'node:fs/promises';
import { Request, Response } from 'express';
import { z } from 'zod';
import { OllamaEmbeddingClient } from './embedding.service';
import { importKnowledgeFile } from './file-ingestion.service';
import { MysqlKnowledgeRepository } from './mysql-knowledge.repository';
import { importKnowledgeUrl } from './url-ingestion.service';

const repository = new MysqlKnowledgeRepository();

const tagsField = z.union([z.array(z.string()), z.string()]).optional().transform((value) => {
    if (!value) return [] as string[];
    const list = Array.isArray(value) ? value : value.split(',');
    return list.map((tag) => tag.trim()).filter(Boolean);
});

const metadataSchema = z.object({
    category: z.nativeEnum(KnowledgeCategory).default(KnowledgeCategory.OTHER),
    priority: z.coerce.number().int().min(0).max(100).default(0),
    tags: tagsField,
});

export const crawlSchema = metadataSchema.extend({
    url: z.string().trim().min(1).max(2000),
});

export const patchMetadataSchema = z.object({
    category: z.nativeEnum(KnowledgeCategory).optional(),
    priority: z.coerce.number().int().min(0).max(100).optional(),
    tags: tagsField,
});

const importReasonMessages: Record<string, string> = {
    unsupported_extension: 'Неподдерживаемый тип файла',
    too_large: 'Файл слишком большой',
    mime_mismatch: 'Тип файла не совпадает с расширением',
    invalid_signature: 'Файл повреждён или не удалось прочитать',
    empty_content: 'Не удалось извлечь текст из файла',
    ocr_required: 'PDF не содержит текста (нужен OCR)',
    extraction_failed: 'Не удалось извлечь текст из файла',
    invalid_url: 'Некорректный URL',
    unsupported_protocol: 'Поддерживаются только http/https ссылки',
    credentials_in_url: 'URL не должен содержать логин/пароль',
    private_address: 'Ссылка ведёт на внутренний/недоступный адрес',
    request_failed: 'Не удалось загрузить страницу по ссылке',
};

export const uploadKnowledgeDocument = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
    const parsed = metadataSchema.safeParse(req.body);
    if (!parsed.success) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: 'Проверьте категорию/приоритет/теги', details: parsed.error.flatten() });
    }
    try {
        // multer renames the file on disk to a random uuid+extension (see knowledge-ingestion.routes.ts);
        // pass the original filename as sourceId/title so the id stays stable across re-uploads of
        // the same file (dedup in stageDocument's upsert) and the title is human-readable rather
        // than the temp disk name.
        const imported = await importKnowledgeFile(req.file.path, { mimeType: req.file.mimetype, sourceId: req.file.originalname });
        if (imported.status !== 'ready' || !imported.document) {
            return res.status(400).json({ message: importReasonMessages[imported.reason ?? ''] ?? 'Не удалось обработать файл', reason: imported.reason });
        }
        imported.document.title = req.file.originalname;
        const { category, priority, tags } = parsed.data;
        const id = await repository.stageDocument({ document: imported.document, category, priority, tags });
        return res.status(201).json({ id, status: KnowledgeDocumentStatus.PENDING });
    } finally {
        await fs.unlink(req.file.path).catch(() => {});
    }
};

export const crawlKnowledgeUrl = async (req: Request, res: Response) => {
    const parsed = crawlSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Проверьте ссылку/категорию/приоритет/теги', details: parsed.error.flatten() });
    const { url, category, priority, tags } = parsed.data;
    const imported = await importKnowledgeUrl(url);
    if (imported.status !== 'ready' || !imported.document) {
        return res.status(400).json({ message: importReasonMessages[imported.reason ?? ''] ?? 'Не удалось загрузить страницу', reason: imported.reason });
    }
    const id = await repository.stageDocument({ document: imported.document, category, priority, tags });
    return res.status(201).json({ id, status: KnowledgeDocumentStatus.PENDING });
};

export const listKnowledgeDocuments = async (req: Request, res: Response) => {
    const category = typeof req.query.category === 'string' && req.query.category in KnowledgeCategory ? req.query.category as KnowledgeCategory : undefined;
    const status = typeof req.query.status === 'string' && req.query.status in KnowledgeDocumentStatus ? req.query.status as KnowledgeDocumentStatus : undefined;
    // Same `_page`/`_limit` query param convention and response shape as GET /invoices.
    const page = Math.max(Number(req.query._page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query._limit) || 20, 1), 100);
    const [{ items, total }, pendingTotal] = await Promise.all([
        repository.listDocumentsPage({ category, status }, { page, limit }),
        repository.countDocuments({ status: KnowledgeDocumentStatus.PENDING }),
    ]);
    return res.json({ items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1), pendingTotal });
};

export const updateKnowledgeDocumentMetadata = async (req: Request, res: Response) => {
    const parsed = patchMetadataSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Проверьте категорию/приоритет/теги', details: parsed.error.flatten() });
    const { category, priority, tags } = parsed.data;
    const updated = await repository.updateMetadata(req.params.id, {
        ...(category ? { category } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(tags.length || req.body.tags !== undefined ? { tags } : {}),
    });
    return res.json(updated);
};

export const deleteKnowledgeDocument = async (req: Request, res: Response) => {
    await repository.deleteDocument(req.params.id);
    return res.status(204).send();
};

export const embedKnowledgeDocument = async (req: Request, res: Response) => {
    try {
        const result = await repository.embedDocument(req.params.id, new OllamaEmbeddingClient());
        return res.json({ id: req.params.id, status: KnowledgeDocumentStatus.ACTIVE, chunks: result.chunks });
    } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : 'Не удалось запустить эмбеддинг' });
    }
};

export const embedPendingKnowledgeDocuments = async (_req: Request, res: Response) => {
    const pending = await repository.listDocuments({ status: KnowledgeDocumentStatus.PENDING });
    const embeddings = new OllamaEmbeddingClient();
    const results: Array<{ id: string; chunks?: number; error?: string }> = [];
    for (const document of pending) {
        try {
            const result = await repository.embedDocument(document.id, embeddings);
            results.push({ id: document.id, chunks: result.chunks });
        } catch (error) {
            results.push({ id: document.id, error: error instanceof Error ? error.message : 'unknown_error' });
        }
    }
    return res.json({ processed: results.length, results });
};
