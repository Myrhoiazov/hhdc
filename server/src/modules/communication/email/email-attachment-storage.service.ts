import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../../prisma/prisma-client';
import { ROOT_DIR } from '../../../common/utils/paths';

// Attachments can contain sensitive client documents (IDs, contracts, photos),
// unlike brand logos or avatars — they must NOT be reachable through the public
// express.static(/public) mount. This directory lives outside `public/` on
// purpose; the only way to read a file back is the authenticated download route.
export const ATTACHMENTS_DIR = path.resolve(ROOT_DIR, 'private-uploads/email-attachments');

interface StoreAttachmentInput {
    filename: string;
    mimeType: string;
    buffer: Buffer;
}

// Shared by both the IMAP sync (incoming mail) and SMTP send (outgoing mail) paths
// so there's exactly one place that decides how attachment files are named and
// where they live on disk.
export const storeAttachmentFile = async (messageDbId: number, input: StoreAttachmentInput) => {
    await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });

    const storedName = `${uuidv4()}${path.extname(input.filename)}`;
    const storagePath = path.join(ATTACHMENTS_DIR, storedName);

    await fs.writeFile(storagePath, input.buffer);

    return prisma.emailAttachment.create({
        data: {
            messageId: messageDbId,
            filename: input.filename,
            mimeType: input.mimeType,
            sizeBytes: input.buffer.length,
            storagePath: storedName,
        },
    });
};
