import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../../common/http';
import type { EmailAttachment } from '../../integrations/email/EmailProvider';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// Files stay in memory only for the request: they are handed to the mailbox provider, not stored.
// multer reads file names as latin1 unless told otherwise; its typings do not know the option yet.
const uploadOptions: multer.Options & { defParamCharset: string } = {
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { files: MAX_ATTACHMENTS, fileSize: MAX_ATTACHMENT_BYTES, fields: 10 },
};
const upload = multer(uploadOptions).array('attachments', MAX_ATTACHMENTS);

const REJECTIONS: Record<string, [number, string]> = {
    LIMIT_FILE_SIZE: [413, 'An attachment is larger than 10 MB'],
    LIMIT_FILE_COUNT: [400, 'No more than 5 attachments can be sent'],
    LIMIT_UNEXPECTED_FILE: [400, 'No more than 5 attachments can be sent'],
};

export const uploadError = (error: unknown): unknown => {
    if (!(error instanceof multer.MulterError)) return error;
    const [status, message] = REJECTIONS[error.code] ?? [400, 'Attachment could not be accepted'];
    return new ApiError(status, 'ATTACHMENT_REJECTED', message);
};

// A JSON request passes through untouched; a multipart one gets its text fields in `req.body`.
export const acceptAttachments: RequestHandler = (req, res, next) => {
    upload(req, res, error => next(error ? uploadError(error) : undefined));
};

// The name ends up in a MIME header and on the recipient's disk: no path, quotes or line breaks.
export const cleanFilename = (name: string): string =>
    path.basename(name.replace(/[\r\n"\\]/g, '').trim()).slice(0, 200) || 'attachment';

interface UploadedFile { originalname: string; mimetype: string; buffer: Buffer }

export const toAttachments = (files: unknown): EmailAttachment[] => (Array.isArray(files) ? files as UploadedFile[] : []).map(file => ({
    filename: cleanFilename(file.originalname),
    contentType: file.mimetype || 'application/octet-stream',
    content: file.buffer,
}));

// What the CRM keeps about a sent file: enough to show it in the thread, never the content.
export const attachmentSummary = (attachments: EmailAttachment[]) =>
    attachments.map(({ filename, contentType, content }) => ({ filename, contentType, size: content.length }));
