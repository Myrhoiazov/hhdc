import { ContractStatus, DocumentType, InvoiceStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { assertDocumentFile, safeFilename } from '../../common/storage/document-file';
import { newStorageKey, sha256, storage } from '../../common/storage/storage';
import { assertChoreographer } from '../choreographers/profile.service';
import { canSeeDocument, invoicePaymentEvidence, isManualPaidLabel, isSensitiveType } from './document.rules';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('').transform((): null => null));
const optionalId = z.string().uuid().nullable().optional().or(z.literal('').transform((): null => null));
const optionalMoney = z.string().trim().transform(value => value.replace(',', '.')).refine(value => /^\d{1,10}(\.\d{1,2})?$/.test(value), 'Use an amount with at most two decimals')
    .nullable().optional().or(z.literal('').transform((): null => null));

const contractFields = { contractStatus: z.nativeEnum(ContractStatus).optional(), expiresAt: optionalDate };
const invoiceFields = {
    invoiceStatus: z.nativeEnum(InvoiceStatus).optional(), invoiceNumber: optionalText(100), issuerName: optionalText(200),
    issueDate: optionalDate, dueDate: optionalDate, amount: optionalMoney,
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).nullable().optional().or(z.literal('').transform((): null => null)),
};

export const createDocumentSchema = z.object({
    type: z.nativeEnum(DocumentType), title: z.string().trim().min(1).max(300), notes: optionalText(2000),
    assignmentId: optionalId, ...contractFields, ...invoiceFields,
}).strict();
export const updateDocumentSchema = z.object({
    title: z.string().trim().min(1).max(300).optional(), notes: optionalText(2000), assignmentId: optionalId,
    archived: z.boolean().optional(), ...contractFields, ...invoiceFields,
}).strict();
type CreateInput = z.infer<typeof createDocumentSchema>;
type UpdateInput = z.infer<typeof updateDocumentSchema>;

export interface DocumentActor { userId: string; permissions: string[] }
export interface DocumentUpload { content: Buffer; filename: string }

const toDate = (value: string | null | undefined): Date | null => (value ? new Date(`${value}T00:00:00Z`) : null);

const VIEW = {
    id: true, type: true, title: true, notes: true, entityId: true, eventId: true, assignmentId: true, currentVersion: true, archivedAt: true, createdAt: true,
    contract: true, invoice: true,
    versions: { orderBy: { version: 'desc' }, select: { version: true, originalFilename: true, mimeType: true, bytes: true, createdAt: true } },
} satisfies Prisma.DocumentSelect;
type DocumentRow = Prisma.DocumentGetPayload<{ select: typeof VIEW }>;

const invoicePayments = (documentIds: string[]) => prisma.choreographerPaymentRecord.findMany({
    where: { invoiceDocumentId: { in: documentIds } }, select: { invoiceDocumentId: true, status: true, amount: true, currency: true },
});

// Never includes a storage key: a file is reachable only through the download endpoint.
const present = async (rows: DocumentRow[]) => {
    const payments = await invoicePayments(rows.filter(row => row.invoice).map(row => row.id));
    const events = await prisma.event.findMany({ where: { id: { in: rows.flatMap(row => (row.eventId ? [row.eventId] : [])) } }, select: { id: true, name: true } });
    return rows.map(row => ({
        ...row,
        event: events.find(event => event.id === row.eventId) ?? null,
        paymentEvidence: row.invoice ? invoicePaymentEvidence(row.invoice, payments.filter(payment => payment.invoiceDocumentId === row.id)) : null,
    }));
};

const visibleTo = (actor: DocumentActor) => (row: { type: string }) => canSeeDocument(row.type, actor.permissions);

export const listPersonDocuments = async (personId: string, actor: DocumentActor, includeArchived = false) => {
    await assertChoreographer(personId);
    const rows = await prisma.document.findMany({
        where: { entityType: 'Person', entityId: personId, currentVersion: { gt: 0 }, ...(includeArchived ? {} : { archivedAt: null }) },
        select: VIEW, orderBy: { createdAt: 'desc' },
    });
    return present(rows.filter(visibleTo(actor)));
};

// The event screen shows the very same documents (same ids), not copies.
export const listEventDocuments = async (eventId: string, actor: DocumentActor) => {
    const rows = await prisma.document.findMany({ where: { eventId, currentVersion: { gt: 0 }, archivedAt: null }, select: VIEW, orderBy: { createdAt: 'desc' } });
    return present(rows.filter(visibleTo(actor)));
};

// An assignment may be linked only if it is this person's own; its event becomes the document's event.
const resolveAssignment = async (personId: string, assignmentId: string | null | undefined) => {
    if (!assignmentId) return { assignmentId: null, eventId: null };
    const assignment = await prisma.eventChoreographer.findFirst({ where: { id: assignmentId, personId }, select: { id: true, eventId: true } });
    if (!assignment) throw new ApiError(400, 'ASSIGNMENT_MISMATCH', 'The assignment does not belong to this choreographer');
    return { assignmentId: assignment.id, eventId: assignment.eventId };
};

const contractData = (input: UpdateInput, previous?: { sentAt: Date | null; signedAt: Date | null }) => ({
    ...(input.contractStatus ? {
        status: input.contractStatus,
        sentAt: input.contractStatus === 'SENT' ? previous?.sentAt ?? new Date() : previous?.sentAt ?? null,
        signedAt: input.contractStatus === 'SIGNED' ? previous?.signedAt ?? new Date() : previous?.signedAt ?? null,
    } : {}),
    ...(input.expiresAt !== undefined ? { expiresAt: toDate(input.expiresAt) } : {}),
});

const invoiceData = (input: UpdateInput) => ({
    ...(input.invoiceStatus ? { status: input.invoiceStatus, paidManually: isManualPaidLabel(input.invoiceStatus) } : {}),
    ...(input.invoiceNumber !== undefined ? { invoiceNumber: input.invoiceNumber } : {}),
    ...(input.issuerName !== undefined ? { issuerName: input.issuerName } : {}),
    ...(input.issueDate !== undefined ? { issueDate: toDate(input.issueDate) } : {}),
    ...(input.dueDate !== undefined ? { dueDate: toDate(input.dueDate) } : {}),
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
});

interface StoredUpload { key: string; content: Buffer; filename: string; mimeType: string }

const storeUpload = async (folder: string, upload: DocumentUpload): Promise<StoredUpload> => {
    const type = assertDocumentFile(upload.content);
    const stored = { key: newStorageKey(folder, type.extension), content: upload.content, filename: safeFilename(upload.filename), mimeType: type.mimeType };
    await storage().put(stored.key, stored.content);
    return stored;
};

const addVersion = async (tx: Prisma.TransactionClient, documentId: string, version: number, stored: StoredUpload, userId: string) => {
    const object = await tx.storageObject.create({ data: { provider: storage().name, key: stored.key, originalFilename: stored.filename, mimeType: stored.mimeType, bytes: stored.content.length, sha256: sha256(stored.content) } });
    await tx.documentVersion.create({ data: { documentId, version, storageObjectId: object.id, originalFilename: stored.filename, mimeType: stored.mimeType, bytes: stored.content.length, checksum: object.sha256, uploadedById: userId } });
    await tx.document.update({ where: { id: documentId }, data: { currentVersion: version } });
};

const history = (tx: Prisma.TransactionClient, action: string, document: { id: string; entityId: string; eventId: string | null }, userId: string) => Promise.all([
    tx.activity.create({ data: { personId: document.entityId, eventId: document.eventId, actorUserId: userId, type: action, entityType: 'Document', entityId: document.id, metadata: {} } }),
    tx.auditLog.create({ data: { actorUserId: userId, action, entityType: 'Document', entityId: document.id } }),
]);

// The same issuer and number twice is usually the same invoice uploaded again: worth a warning, not a refusal.
const findDuplicateInvoice = async (documentId: string, invoice: { issuerName: string | null; invoiceNumber: string | null } | null) => {
    if (!invoice?.issuerName || !invoice.invoiceNumber) return null;
    const other = await prisma.invoice.findFirst({ where: { issuerName: invoice.issuerName, invoiceNumber: invoice.invoiceNumber, documentId: { not: documentId } }, select: { documentId: true } });
    return other?.documentId ?? null;
};

const view = async (documentId: string) => {
    const row = await prisma.document.findUniqueOrThrow({ where: { id: documentId }, select: VIEW });
    const [document] = await present([row]);
    return { ...document, duplicateOfDocumentId: await findDuplicateInvoice(documentId, row.invoice) };
};

interface CreateParams { personId: string; input: CreateInput; upload: DocumentUpload; actor: DocumentActor }

const insertDocument = (params: CreateParams, link: { assignmentId: string | null; eventId: string | null }, stored: StoredUpload) => prisma.$transaction(async tx => {
    const { input, personId, actor } = params;
    const document = await tx.document.create({ data: { entityType: 'Person', entityId: personId, type: input.type, title: input.title, notes: input.notes, createdById: actor.userId, ...link } });
    if (input.type === 'CONTRACT') await tx.contract.create({ data: { documentId: document.id, ...contractData(input) } });
    if (input.type === 'INVOICE') await tx.invoice.create({ data: { documentId: document.id, ...invoiceData(input) } });
    await addVersion(tx, document.id, 1, stored, actor.userId);
    await history(tx, 'DOCUMENT_UPLOADED', document, actor.userId);
    return document.id;
});

export const createPersonDocument = async (params: CreateParams) => {
    await assertChoreographer(params.personId);
    const link = await resolveAssignment(params.personId, params.input.assignmentId);
    const stored = await storeUpload(`documents/${params.personId}`, params.upload);
    try { return await view(await insertDocument(params, link, stored)); }
    catch (error) {
        // No file may be left behind when its record was not written.
        await storage().remove(stored.key);
        throw error;
    }
};

// Every access is checked again here, by id: knowing a document id is never enough.
const requireDocument = async (documentId: string, actor: DocumentActor) => {
    const document = await prisma.document.findFirst({ where: { id: documentId, entityType: 'Person', currentVersion: { gt: 0 } }, include: { contract: true, invoice: true } });
    if (!document || !canSeeDocument(document.type, actor.permissions)) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found');
    return document;
};

export const getDocumentFile = async (documentId: string, actor: DocumentActor) => {
    await requireDocument(documentId, actor);
    return view(documentId);
};

export const replaceDocumentFile = async (documentId: string, upload: DocumentUpload, actor: DocumentActor) => {
    const document = await requireDocument(documentId, actor);
    const stored = await storeUpload(`documents/${document.entityId}`, upload);
    try {
        await prisma.$transaction(async tx => {
            const current = await tx.document.findUniqueOrThrow({ where: { id: documentId }, select: { currentVersion: true } });
            await addVersion(tx, documentId, current.currentVersion + 1, stored, actor.userId);
            await history(tx, 'DOCUMENT_VERSION_ADDED', document, actor.userId);
        }, { isolationLevel: 'Serializable' });
    } catch (error) {
        await storage().remove(stored.key);
        throw error;
    }
    return view(documentId);
};

export const updateDocumentFile = async (documentId: string, input: UpdateInput, actor: DocumentActor) => {
    const document = await requireDocument(documentId, actor);
    const link = input.assignmentId !== undefined ? await resolveAssignment(document.entityId, input.assignmentId) : {};
    await prisma.$transaction(async tx => {
        await tx.document.update({ where: { id: documentId }, data: {
            ...(input.title ? { title: input.title } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}), ...link,
            ...(input.archived !== undefined ? { archivedAt: input.archived ? new Date() : null } : {}),
        } });
        if (document.contract) await tx.contract.update({ where: { documentId }, data: contractData(input, document.contract) });
        if (document.invoice) await tx.invoice.update({ where: { documentId }, data: invoiceData(input) });
        await history(tx, input.archived ? 'DOCUMENT_ARCHIVED' : 'DOCUMENT_UPDATED', document, actor.userId);
    });
    return view(documentId);
};

// Reading a contract or an invoice is itself recorded.
export const downloadDocumentFile = async (documentId: string, version: number | undefined, actor: DocumentActor) => {
    const document = await requireDocument(documentId, actor);
    const row = await prisma.documentVersion.findFirst({ where: { documentId, version: version ?? document.currentVersion } });
    if (!row) throw new ApiError(404, 'DOCUMENT_VERSION_NOT_FOUND', 'Document version not found');
    const object = await prisma.storageObject.findUniqueOrThrow({ where: { id: row.storageObjectId } });
    if (isSensitiveType(document.type)) await prisma.auditLog.create({ data: { actorUserId: actor.userId, action: 'DOCUMENT_DOWNLOADED', entityType: 'Document', entityId: documentId, after: { version: row.version } } });
    return { content: await storage().read(object.key), mimeType: row.mimeType, filename: row.originalFilename };
};
