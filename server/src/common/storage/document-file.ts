import { ApiError } from '../http';
import { detectImageFormat } from './image';

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export interface DocumentFileType { extension: string; mimeType: string; inline: boolean }

const TYPES: Record<string, DocumentFileType> = {
    pdf: { extension: 'pdf', mimeType: 'application/pdf', inline: true },
    docx: { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', inline: false },
    jpeg: { extension: 'jpg', mimeType: 'image/jpeg', inline: true },
    png: { extension: 'png', mimeType: 'image/png', inline: true },
    webp: { extension: 'webp', mimeType: 'image/webp', inline: true },
};

const startsWith = (content: Buffer, text: string) => content.subarray(0, text.length).toString('latin1') === text;

// A .docx is a ZIP archive that carries a Word document part. Any other archive (or a renamed
// executable) is not a document, whatever its file name says.
const isDocx = (content: Buffer): boolean => startsWith(content, 'PK\u0003\u0004') && content.includes('[Content_Types].xml') && content.includes('word/');

// The type is decided by the file's own bytes, never by its name or the MIME type the browser sent.
export const detectDocumentFile = (content: Buffer): DocumentFileType | null => {
    if (startsWith(content, '%PDF-')) return TYPES.pdf;
    const image = detectImageFormat(content);
    if (image) return TYPES[image];
    return isDocx(content) ? TYPES.docx : null;
};

export const assertDocumentFile = (content: Buffer): DocumentFileType => {
    if (content.length > MAX_DOCUMENT_BYTES) throw new ApiError(413, 'DOCUMENT_REJECTED', 'A document cannot be larger than 20 MB');
    const type = detectDocumentFile(content);
    if (!type) throw new ApiError(400, 'DOCUMENT_REJECTED', 'Only PDF, DOCX, JPEG, PNG and WebP files are accepted');
    return type;
};

// Shown to people and sent in a header: no path, no control characters, no quotes.
export const safeFilename = (name: string): string => (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f"<>|:*?]/g, '').trim().slice(0, 200) || 'document';
