import express, { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../../auth/auth.middleware';
import {
    createAccount,
    deleteAccount,
    deleteMessageController,
    downloadAttachment,
    getMessage,
    getUnreadMessageCount,
    listAccounts,
    listMessages,
    markMessageAsSpamController,
    replyToMessageController,
    sendMessageController,
    syncAccount,
} from './email.controller';

const router = express.Router();

// Memory storage: attachments are small enough (10MB x 5) to hold in memory for
// the moment it takes to hand them to nodemailer and to storeAttachmentFile —
// no need for a temp file on disk first.
const outgoingAttachmentsUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const uploadOutgoingAttachments = (req: Request, res: Response, next: NextFunction) => {
    outgoingAttachmentsUpload.array('attachments', 5)(req, res, (error) => {
        if (!error) return next();
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Каждый файл должен быть меньше 10 МБ' });
        }
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_COUNT') {
            return res.status(413).json({ message: 'Можно приложить не более 5 файлов' });
        }
        return res.status(400).json({ message: error.message || 'Не удалось загрузить вложения' });
    });
};

// The entire email module is ADMIN-only per the module spec — no other role gets
// access to mailbox connections, inbox contents, or the ability to send email.
router.use(asyncHandler(isToken), requireRole(UserRole.ADMIN));

router.get('/accounts', asyncHandler(listAccounts));
router.post('/accounts', asyncHandler(createAccount));
router.delete('/accounts/:id', asyncHandler(deleteAccount));
router.post('/accounts/:id/sync', asyncHandler(syncAccount));

router.get('/messages', asyncHandler(listMessages));
router.get('/messages/unread-count', asyncHandler(getUnreadMessageCount));
router.get('/messages/:id', asyncHandler(getMessage));
router.delete('/messages/:id', asyncHandler(deleteMessageController));
router.post('/messages/:id/spam', asyncHandler(markMessageAsSpamController));
router.post('/messages/:id/reply', uploadOutgoingAttachments, asyncHandler(replyToMessageController));

router.post('/send', uploadOutgoingAttachments, asyncHandler(sendMessageController));

router.get('/attachments/:id/download', asyncHandler(downloadAttachment));

export default router;
