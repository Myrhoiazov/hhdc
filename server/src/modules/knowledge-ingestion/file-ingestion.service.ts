import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { normalizeKnowledgeDocument, normalizeKnowledgeHtml, type NormalizedKnowledgeDocument, type SourceDocument } from './knowledge-ingestion.service';

export const MAX_KNOWLEDGE_FILE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_KNOWLEDGE_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.html', '.htm'] as const;

export type FileImportStatus = 'ready' | 'rejected' | 'extraction_required';

export interface FileImportResult {
    status: FileImportStatus;
    reason?: 'unsupported_extension' | 'too_large' | 'mime_mismatch' | 'invalid_signature' | 'empty_content' | 'ocr_required' | 'extraction_failed';
    document?: NormalizedKnowledgeDocument;
    fileName: string;
    sizeBytes: number;
}

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toReadyOrEmptyResult = (
    base: { fileName: string; sizeBytes: number },
    text: string,
    emptyStatus: FileImportResult['status'],
    emptyReason: NonNullable<FileImportResult['reason']>,
    options: { sourceId?: string; language?: string; now?: Date },
): FileImportResult => {
    const trimmed = text.trim();
    if (!trimmed) return { ...base, status: emptyStatus, reason: emptyReason };
    const source: SourceDocument = {
        ref: { sourceType: 'file', sourceId: options.sourceId ?? base.fileName, sourceUrl: `file://${base.fileName}`, language: options.language ?? 'nl' },
        title: base.fileName,
        html: `<p>${escapeHtml(trimmed)}</p>`,
    };
    return { ...base, status: 'ready', document: normalizeKnowledgeDocument(source, options.now ?? new Date()) };
};

const mimeByExtension: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    '.txt': ['text/plain'],
    '.md': ['text/markdown', 'text/plain'],
    '.html': ['text/html'],
    '.htm': ['text/html'],
};

const hasSignature = (extension: string, bytes: Buffer): boolean => {
    if (extension === '.pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
    if (extension === '.docx') return bytes.subarray(0, 2).toString() === 'PK';
    return true;
};

type FileImportBase = { fileName: string; sizeBytes: number };
type FileImportOptions = { sourceId?: string; language?: string; now?: Date };

const rejectIfInvalid = (
    extension: string,
    bytes: Buffer,
    mimeType: string | undefined,
    base: FileImportBase,
): FileImportResult | null => {
    if (!SUPPORTED_KNOWLEDGE_EXTENSIONS.includes(extension as typeof SUPPORTED_KNOWLEDGE_EXTENSIONS[number])) return { ...base, status: 'rejected', reason: 'unsupported_extension' };
    if (bytes.length > MAX_KNOWLEDGE_FILE_BYTES) return { ...base, status: 'rejected', reason: 'too_large' };
    if (mimeType && !mimeByExtension[extension].includes(mimeType.toLowerCase())) return { ...base, status: 'rejected', reason: 'mime_mismatch' };
    if (!hasSignature(extension, bytes)) return { ...base, status: 'rejected', reason: 'invalid_signature' };
    return null;
};

const importPdfFile = async (bytes: Buffer, base: FileImportBase, options: FileImportOptions): Promise<FileImportResult> => {
    let text: string;
    let parser: PDFParse | undefined;
    try {
        parser = new PDFParse({ data: bytes });
        // An empty pageJoiner avoids injecting "-- page N of M --" boundary markers into
        // the extracted text, which would otherwise defeat the empty-content check below.
        text = (await parser.getText({ pageJoiner: '' })).text;
    } catch {
        return { ...base, status: 'rejected', reason: 'extraction_failed' };
    } finally {
        await parser?.destroy();
    }
    // A structurally valid PDF with no extractable text is almost always scanned/image-only.
    return toReadyOrEmptyResult(base, text, 'extraction_required', 'ocr_required', options);
};

const importDocxFile = async (bytes: Buffer, base: FileImportBase, options: FileImportOptions): Promise<FileImportResult> => {
    let text: string;
    try {
        text = (await mammoth.extractRawText({ buffer: bytes })).value;
    } catch {
        return { ...base, status: 'rejected', reason: 'extraction_failed' };
    }
    return toReadyOrEmptyResult(base, text, 'rejected', 'empty_content', options);
};

const importTextLikeFile = (extension: string, bytes: Buffer, base: FileImportBase, options: FileImportOptions): FileImportResult => {
    const raw = bytes.toString('utf8');
    const content = extension === '.html' || extension === '.htm' ? normalizeKnowledgeHtml(raw) : raw.trim();
    if (!content) return { ...base, status: 'rejected', reason: 'empty_content' };
    const source: SourceDocument = {
        ref: { sourceType: 'file', sourceId: options.sourceId ?? base.fileName, sourceUrl: `file://${base.fileName}`, language: options.language ?? 'nl' },
        title: base.fileName,
        html: extension === '.html' || extension === '.htm' ? raw : `<p>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
    };
    return { ...base, status: 'ready', document: normalizeKnowledgeDocument(source, options.now ?? new Date()) };
};

export const importKnowledgeFile = async (
    filePath: string,
    options: { mimeType?: string; sourceId?: string; language?: string; now?: Date } = {},
): Promise<FileImportResult> => {
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName).toLowerCase();
    let bytes: Buffer;
    try { bytes = await readFile(filePath); } catch { return { status: 'rejected', reason: 'invalid_signature', fileName, sizeBytes: 0 }; }
    const base = { fileName, sizeBytes: bytes.length };

    const invalid = rejectIfInvalid(extension, bytes, options.mimeType, base);
    if (invalid) return invalid;

    if (extension === '.pdf') return importPdfFile(bytes, base, options);
    if (extension === '.docx') return importDocxFile(bytes, base, options);
    return importTextLikeFile(extension, bytes, base, options);
};
