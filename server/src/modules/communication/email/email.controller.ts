import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import prisma from '../../../../prisma/prisma-client';
import ApiError from '../../../common/errors/api-error';
import { logger } from '../../../common/logger';
import { encryptEmailSecret } from './email-crypto.service';
import { ATTACHMENTS_DIR, moveMessageOnServer, syncEmailAccount, verifyImapConnection } from './email-imap.service';
import { composeEmail, replyToMessage } from './email-smtp.service';

const attachmentSelect = {
    id: true,
    filename: true,
    mimeType: true,
    sizeBytes: true,
    // storagePath is intentionally omitted — the client only ever needs the
    // download route, never the on-disk filename.
};

const accountSelect = {
    id: true,
    label: true,
    imapHost: true,
    imapPort: true,
    imapSecure: true,
    smtpHost: true,
    smtpPort: true,
    smtpSecure: true,
    username: true,
    isActive: true,
    trashFolder: true,
    spamFolder: true,
    lastSyncedAt: true,
    createdAt: true,
    // passwordEncrypted is intentionally omitted — it must never leave the server.
};

// Used only by listMessages — bodyText/bodyHtml are @db.Text (full email content, can be tens
// of KB each) and EmailMessageList only renders metadata; the full body is fetched separately
// per-message by getMessage when a message is actually opened (see
// client/src/pages/EmailPage/ui/EmailPage/useEmailMessageSelection.ts:onSelectMessage).
const messageListSelect = {
    id: true,
    mailboxId: true,
    imapUid: true,
    messageId: true,
    inReplyToMessageId: true,
    isOutgoing: true,
    fromAddress: true,
    fromName: true,
    replyToAddress: true,
    toAddresses: true,
    ccAddresses: true,
    subject: true,
    receivedAt: true,
    isRead: true,
    clientId: true,
    createdAt: true,
};

export const listAccounts = async (req: Request, res: Response) => {
    const accounts = await prisma.emailAccount.findMany({
        select: accountSelect,
        orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(accounts);
};

export const createAccount = async (req: Request, res: Response) => {
    const {
        label, imapHost, imapPort, imapSecure, smtpHost, smtpPort, smtpSecure, username, password,
        trashFolder, spamFolder,
    } = req.body;

    if (!label || !imapHost || !imapPort || !smtpHost || !smtpPort || !username || !password) {
        throw ApiError.BadRequest('Заполните все поля: название, IMAP host/port, SMTP host/port, логин и пароль');
    }

    try {
        await verifyImapConnection({
            imapHost,
            imapPort: Number(imapPort),
            imapSecure: imapSecure !== false,
            username,
            password,
        });
    } catch (error) {
        logger.error(`IMAP connection check failed for ${imapHost}:${imapPort} (${username}): ${error}`);
        throw ApiError.BadRequest('Не удалось подключиться к IMAP-серверу с этими данными. Проверьте host, порт и пароль.');
    }

    const account = await prisma.emailAccount.create({
        data: {
            label,
            imapHost,
            imapPort: Number(imapPort),
            imapSecure: imapSecure !== false,
            smtpHost,
            smtpPort: Number(smtpPort),
            smtpSecure: smtpSecure !== false,
            username,
            passwordEncrypted: encryptEmailSecret(password),
            ...(trashFolder ? { trashFolder } : {}),
            ...(spamFolder ? { spamFolder } : {}),
        },
        select: accountSelect,
    });

    return res.status(201).json(account);
};

export const deleteAccount = async (req: Request, res: Response) => {
    const accountId = Number(req.params.id);

    if (!accountId) {
        throw ApiError.BadRequest('Не указан id ящика');
    }

    await prisma.emailAccount.delete({ where: { id: accountId } });

    return res.status(200).json({ message: 'Deleted' });
};

export const syncAccount = async (req: Request, res: Response) => {
    const accountId = Number(req.params.id);

    if (!accountId) {
        throw ApiError.BadRequest('Не указан id ящика');
    }

    try {
        const result = await syncEmailAccount(accountId);
        return res.status(200).json(result);
    } catch (error) {
        logger.error(`Email sync failed for account=${accountId}: ${error}`);
        throw ApiError.BadRequest(error instanceof Error ? error.message : 'Не удалось синхронизировать почту');
    }
};

export const listMessages = async (req: Request, res: Response) => {
    const mailboxId = req.query.mailboxId ? Number(req.query.mailboxId) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where = {
        mailboxId,
        clientId,
        ...(search && {
            OR: [
                { subject: { contains: search } },
                { fromAddress: { contains: search } },
                { fromName: { contains: search } },
                { bodyText: { contains: search } },
            ],
        }),
    };

    const [items, total] = await Promise.all([
        prisma.emailMessage.findMany({
            where,
            orderBy: { receivedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                ...messageListSelect,
                client: { select: { id: true, firstName: true, lastName: true, email: true } },
                attachments: { select: attachmentSelect },
            },
        }),
        prisma.emailMessage.count({ where }),
    ]);

    return res.status(200).json({ items, total });
};

// Incoming messages default to isRead: false; outgoing ones are always created
// with isRead: true (see email-smtp.service.ts), so this is exactly "unread inbox mail".
export const getUnreadMessageCount = async (req: Request, res: Response) => {
    const count = await prisma.emailMessage.count({ where: { isRead: false } });

    return res.status(200).json({ count });
};

export const getMessage = async (req: Request, res: Response) => {
    const messageId = Number(req.params.id);

    if (!messageId) {
        throw ApiError.BadRequest('Не указан id письма');
    }

    const message = await prisma.emailMessage.update({
        where: { id: messageId },
        data: { isRead: true },
        include: {
            client: { select: { id: true, firstName: true, lastName: true, email: true } },
            attachments: { select: attachmentSelect },
        },
    });

    return res.status(200).json(message);
};

// Shared by delete and "mark as spam": removes the attachment files from disk
// (the DB rows disappear on their own via onDelete: Cascade when the message
// row is deleted, but cascade never touches the filesystem).
const removeMessageAndAttachmentFiles = async (messageId: number) => {
    const attachments = await prisma.emailAttachment.findMany({
        where: { messageId },
        select: { storagePath: true },
    });

    for (const attachment of attachments) {
        const filePath = path.join(ATTACHMENTS_DIR, path.basename(attachment.storagePath));
        fs.rm(filePath, { force: true }, (error) => {
            if (error) {
                logger.error(`Failed to remove attachment file "${filePath}": ${error}`);
            }
        });
    }

    await prisma.emailMessage.delete({ where: { id: messageId } });
};

const moveMessageToFolder = async (req: Request, res: Response, folder: 'trashFolder' | 'spamFolder') => {
    const messageId = Number(req.params.id);

    if (!messageId) {
        throw ApiError.BadRequest('Не указан id письма');
    }

    const message = await prisma.emailMessage.findUnique({
        where: { id: messageId },
        include: { mailbox: { select: { trashFolder: true, spamFolder: true } } },
    });

    if (!message) {
        throw ApiError.BadRequest('Письмо не найдено');
    }

    // Outgoing messages only ever existed in our own DB — they were never synced
    // from the server, so there's nothing to move on the IMAP side, only the
    // local record to remove.
    if (message.imapUid !== null) {
        try {
            await moveMessageOnServer(message.mailboxId, message.imapUid, message.mailbox[folder]);
        } catch (error) {
            logger.error(`Failed to move message=${messageId} (uid=${message.imapUid}) to ${folder}: ${error}`);
            throw ApiError.BadRequest(error instanceof Error ? error.message : 'Не удалось переместить письмо на сервере');
        }
    }

    await removeMessageAndAttachmentFiles(messageId);

    return res.status(200).json({ message: 'OK' });
};

export const deleteMessageController = async (req: Request, res: Response) => moveMessageToFolder(req, res, 'trashFolder');

export const markMessageAsSpamController = async (req: Request, res: Response) => moveMessageToFolder(req, res, 'spamFolder');

export const downloadAttachment = async (req: Request, res: Response) => {
    const attachmentId = Number(req.params.id);

    if (!attachmentId) {
        throw ApiError.BadRequest('Не указан id вложения');
    }

    const attachment = await prisma.emailAttachment.findUnique({
        where: { id: attachmentId },
        select: { mimeType: true, filename: true, storagePath: true },
    });

    if (!attachment) {
        throw ApiError.BadRequest('Вложение не найдено');
    }

    // storagePath is just a filename (see email-imap.service saveAttachments) —
    // resolving it against the fixed ATTACHMENTS_DIR keeps this from ever being
    // tricked into reading a path outside that directory.
    const filePath = path.join(ATTACHMENTS_DIR, path.basename(attachment.storagePath));

    if (!fs.existsSync(filePath)) {
        throw ApiError.BadRequest('Файл вложения отсутствует на сервере');
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
    return res.sendFile(filePath);
};

// multipart/form-data only carries string fields — array fields (to/cc) are
// sent by the client as JSON-encoded strings and parsed back out here.
const parseJsonArrayField = (value: unknown): string[] | undefined => {
    if (typeof value !== 'string' || !value) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : undefined;
    } catch {
        return undefined;
    }
};

const filesToAttachmentInputs = (files: Express.Multer.File[] | undefined) => files?.map((file) => ({
    filename: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
}));

export const replyToMessageController = async (req: Request, res: Response) => {
    const messageId = Number(req.params.id);
    const { html } = req.body;

    if (!messageId || !html) {
        throw ApiError.BadRequest('Текст ответа обязателен');
    }

    try {
        const sent = await replyToMessage(messageId, html, filesToAttachmentInputs(req.files as Express.Multer.File[]));
        return res.status(201).json(sent);
    } catch (error) {
        logger.error(`Failed to send reply to message=${messageId}: ${error}`);
        throw ApiError.BadRequest(error instanceof Error ? error.message : 'Не удалось отправить ответ');
    }
};

export const sendMessageController = async (req: Request, res: Response) => {
    const { accountId, subject, html } = req.body;
    const to = parseJsonArrayField(req.body.to);
    const cc = parseJsonArrayField(req.body.cc);

    if (!accountId || !to?.length || !subject || !html) {
        throw ApiError.BadRequest('Укажите ящик-отправитель, получателя, тему и текст письма');
    }

    try {
        const sent = await composeEmail(Number(accountId), {
            to,
            cc,
            subject,
            html,
            attachments: filesToAttachmentInputs(req.files as Express.Multer.File[]),
        });
        return res.status(201).json(sent);
    } catch (error) {
        logger.error(`Failed to send email from account=${accountId}: ${error}`);
        throw ApiError.BadRequest(error instanceof Error ? error.message : 'Не удалось отправить письмо');
    }
};
