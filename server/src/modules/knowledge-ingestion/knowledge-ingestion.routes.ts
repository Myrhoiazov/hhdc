import express, { Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import os from 'node:os';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { MAX_KNOWLEDGE_FILE_BYTES, SUPPORTED_KNOWLEDGE_EXTENSIONS } from './file-ingestion.service';
import {
    crawlKnowledgeUrl, deleteKnowledgeDocument, embedKnowledgeDocument, embedPendingKnowledgeDocuments,
    listKnowledgeDocuments, updateKnowledgeDocumentMetadata, uploadKnowledgeDocument,
} from './knowledge-ingestion.controller';

const router = express.Router();

// Uploaded files are only ever read once (text extraction) and then deleted — see
// uploadKnowledgeDocument's finally block — so a plain OS temp dir is enough; nothing is served
// back from disk the way brand logos are. The filename function must preserve the original
// extension: multer's default temp filename has none, and importKnowledgeFile determines file
// type from the extension of the path on disk, not from req.file.originalname.
const knowledgeUpload = multer({
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
    }),
    limits: { fileSize: MAX_KNOWLEDGE_FILE_BYTES },
    fileFilter: (_req, file, cb) => (SUPPORTED_KNOWLEDGE_EXTENSIONS as readonly string[]).includes(path.extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : cb(new Error('Неподдерживаемый тип файла')),
});
const uploadKnowledgeFile = (req: Request, res: Response, next: express.NextFunction) => {
    knowledgeUpload.single('file')(req, res, (error) => {
        if (!error) return next();
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Файл слишком большой' });
        }
        return res.status(400).json({ message: error.message || 'Не удалось загрузить файл' });
    });
};

const admin = requireRole(UserRole.ADMIN);

router.get('/documents', asyncHandler(isToken), admin, asyncHandler(listKnowledgeDocuments));
router.post('/documents/upload', asyncHandler(isToken), admin, uploadKnowledgeFile, asyncHandler(uploadKnowledgeDocument));
router.post('/documents/crawl', asyncHandler(isToken), admin, asyncHandler(crawlKnowledgeUrl));
router.patch('/documents/:id', asyncHandler(isToken), admin, asyncHandler(updateKnowledgeDocumentMetadata));
router.delete('/documents/:id', asyncHandler(isToken), admin, asyncHandler(deleteKnowledgeDocument));
router.post('/documents/:id/embed', asyncHandler(isToken), admin, asyncHandler(embedKnowledgeDocument));
router.post('/documents/embed', asyncHandler(isToken), admin, asyncHandler(embedPendingKnowledgeDocuments));

export default router;
