import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { HStack, VStack } from '@/shared/ui/Stack';
import { EmailAttachment } from '../../model/types/emailMessage';
import cls from './EmailMessageDetail.module.scss';

const attachmentDownloadUrl = (attachmentId: number) => `${__API__}/api/v1/email/attachments/${attachmentId}/download`;

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

interface EmailMessageAttachmentsProps {
    attachments: EmailAttachment[];
}

export const EmailMessageAttachments = memo(({ attachments }: EmailMessageAttachmentsProps) => {
    if (attachments.length === 0) return null;

    return (
        <VStack gap="8" max className={cls.attachments}>
            <Text title={`Вложения (${attachments.length})`} size="s" bold />
            <HStack gap="8" wrap="wrap">
                {attachments.map((attachment) => (
                    <a
                        key={attachment.id}
                        href={attachmentDownloadUrl(attachment.id)}
                        className={cls.attachment}
                        download={attachment.filename}
                    >
                        <span className={cls.attachmentName}>{attachment.filename}</span>
                        <span className={cls.attachmentSize}>{formatFileSize(attachment.sizeBytes)}</span>
                    </a>
                ))}
            </HStack>
        </VStack>
    );
});
