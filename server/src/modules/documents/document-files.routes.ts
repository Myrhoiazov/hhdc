import { Request, RequestHandler, Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ApiError, route } from '../../common/http';
import { detectDocumentFile, MAX_DOCUMENT_BYTES } from '../../common/storage/document-file';
import { currentUser, permitted } from '../auth/auth.middleware';
import {
    createDocumentSchema, createPersonDocument, downloadDocumentFile, getDocumentFile, listEventDocuments, listPersonDocuments,
    replaceDocumentFile, updateDocumentFile, updateDocumentSchema,
} from './document-files.service';

const param = (req: Request, name: string) => z.string().uuid().parse(req.params[name]);
const actor = (req: Request) => ({ userId: currentUser(req).id, permissions: currentUser(req).permissions });

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: MAX_DOCUMENT_BYTES, fields: 20 } }).single('file');
const acceptDocument: RequestHandler = (req, res, next) => {
    upload(req, res, error => next(error instanceof multer.MulterError ? new ApiError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'DOCUMENT_REJECTED', 'A document cannot be larger than 20 MB') : error));
};
const uploaded = (req: Request) => {
    if (!req.file) throw new ApiError(400, 'DOCUMENT_REJECTED', 'Attach a file');
    return { content: req.file.buffer, filename: req.file.originalname };
};

// Documents of a choreographer; mounted on /choreographers.
export const choreographerDocumentRoutes = Router();
choreographerDocumentRoutes.get('/:personId/documents', permitted('documents.read'), route(req => listPersonDocuments(param(req, 'personId'), actor(req), req.query.archived === 'true')));
choreographerDocumentRoutes.post('/:personId/documents', permitted('documents.write'), acceptDocument, route(req => createPersonDocument({
    personId: param(req, 'personId'), input: createDocumentSchema.parse(req.body), upload: uploaded(req), actor: actor(req),
})));

// File documents by id; mounted on /documents before the legacy metadata routes.
export const documentFileRoutes = Router();
documentFileRoutes.get('/by-event/:eventId', permitted('documents.read'), route(req => listEventDocuments(param(req, 'eventId'), actor(req))));
documentFileRoutes.get('/:documentId/file', permitted('documents.read'), route(req => getDocumentFile(param(req, 'documentId'), actor(req))));
documentFileRoutes.post('/:documentId/versions', permitted('documents.write'), acceptDocument, route(req => replaceDocumentFile(param(req, 'documentId'), uploaded(req), actor(req))));
documentFileRoutes.patch('/:documentId/metadata', permitted('documents.write'), route(req => updateDocumentFile(param(req, 'documentId'), updateDocumentSchema.parse(req.body), actor(req))));

const versionSchema = z.coerce.number().int().min(1).optional();

documentFileRoutes.get('/:documentId/download', permitted('documents.read'), async (req, res, next) => {
    try {
        const file = await downloadDocumentFile(param(req, 'documentId'), versionSchema.parse(req.query.version), actor(req));
        const inline = detectDocumentFile(file.content)?.inline ?? false;
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-store');
        // A previewed file is isolated: no scripts, no access to the CRM origin.
        res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
        res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
        res.send(file.content);
    } catch (error) { next(error); }
});
