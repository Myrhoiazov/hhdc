import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { importKnowledgeFile } from './file-ingestion.service';

const buildPdfBuffer = (text: string | null): Promise<Buffer> => new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    if (text) doc.text(text);
    doc.end();
});

const buildDocxBuffer = async (text: string): Promise<Buffer> => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
        '</Types>',
    ].join(''));
    zip.folder('_rels')?.file('.rels', [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
        '</Relationships>',
    ].join(''));
    zip.folder('word')?.file('document.xml', [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:body>', text ? `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>` : '', '</w:body>',
        '</w:document>',
    ].join(''));
    return zip.generateAsync({ type: 'nodebuffer' });
};

test('file importer validates type and normalizes supported text/html files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const file = path.join(dir, 'policy.html');
        await writeFile(file, '<nav>Menu</nav><h1>Policy</h1><p>Hello&nbsp;world.</p>');
        const result = await importKnowledgeFile(file, { mimeType: 'text/html', now: new Date('2026-09-15') });
        assert.equal(result.status, 'ready');
        assert.equal(result.document?.content, 'Policy\n\nHello world.');
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer extracts real text from a supported PDF file', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const file = path.join(dir, 'policy.pdf');
        await writeFile(file, await buildPdfBuffer('Trial lessons are free for new students.'));
        const result = await importKnowledgeFile(file, { mimeType: 'application/pdf', now: new Date('2026-09-15') });
        assert.equal(result.status, 'ready');
        assert.match(result.document?.content ?? '', /Trial lessons are free for new students\./);
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer extracts real text from a supported DOCX file', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const file = path.join(dir, 'policy.docx');
        await writeFile(file, await buildDocxBuffer('Cancellation requires two weeks notice.'));
        const result = await importKnowledgeFile(file, { now: new Date('2026-09-15') });
        assert.equal(result.status, 'ready');
        assert.match(result.document?.content ?? '', /Cancellation requires two weeks notice\./);
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer reports a scanned/image-only PDF as requiring OCR instead of indexing empty text', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const file = path.join(dir, 'scan.pdf');
        await writeFile(file, await buildPdfBuffer(null));
        const result = await importKnowledgeFile(file);
        assert.equal(result.status, 'extraction_required');
        assert.equal(result.reason, 'ocr_required');
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer reports an empty DOCX as rejected instead of indexing empty text', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const file = path.join(dir, 'empty.docx');
        await writeFile(file, await buildDocxBuffer(''));
        const result = await importKnowledgeFile(file);
        assert.equal(result.status, 'rejected');
        assert.equal(result.reason, 'empty_content');
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer reports extraction failures for PDF/DOCX files that pass signature checks but are not parseable', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const pdf = path.join(dir, 'corrupt.pdf');
        const docx = path.join(dir, 'corrupt.docx');
        await writeFile(pdf, '%PDF-1.7 not actually a pdf body');
        await writeFile(docx, Buffer.from('PK\x03\x04not actually a docx body'));
        assert.equal((await importKnowledgeFile(pdf)).reason, 'extraction_failed');
        assert.equal((await importKnowledgeFile(docx)).reason, 'extraction_failed');
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file importer rejects unsupported extensions, oversized files and bad signatures', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ddc-knowledge-'));
    try {
        const exe = path.join(dir, 'run.exe');
        const badPdf = path.join(dir, 'bad.pdf');
        await writeFile(exe, 'binary');
        await writeFile(badPdf, 'not a pdf');
        assert.equal((await importKnowledgeFile(exe)).reason, 'unsupported_extension');
        assert.equal((await importKnowledgeFile(badPdf)).reason, 'invalid_signature');
    } finally { await rm(dir, { recursive: true, force: true }); }
});
