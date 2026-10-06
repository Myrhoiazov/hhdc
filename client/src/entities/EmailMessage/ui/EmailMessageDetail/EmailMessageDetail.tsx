import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { EmailMessage } from '../../model/types/emailMessage';
import { EmailComposer, EmailComposerSendPayload } from '../EmailComposer/EmailComposer';
import { EmailMessageDetailHeader } from './EmailMessageDetailHeader';
import { EmailMessageAttachments } from './EmailMessageAttachments';
import cls from './EmailMessageDetail.module.scss';

interface EmailMessageDetailProps {
    message: EmailMessage;
    isSendingReply?: boolean;
    isDeleting?: boolean;
    isMarkingAsSpam?: boolean;
    onReply: (html: string, files?: File[]) => Promise<boolean>;
    onDelete: () => void;
    onMarkAsSpam: () => void;
}

// Most HTML emails are built as fixed-width tables (~600px), so they render
// consistently across mail clients — `table { width: 100% }` stretches that
// safely. Forcing width:100% on *every* div/p is tempting but wrong: quoted
// "On ... wrote:" reply blocks are commonly indented with margin-left, and
// width:100% + that margin overflows the container, which is what caused the
// clipped/double-scrollbar mess. So we only cap growth (max-width) there and
// rely on overflow-wrap + hidden horizontal scroll as a safety net.
const buildResponsiveEmailHtml = (html: string) => `
    <style>
        html, body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            font-family: sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        * { max-width: 100% !important; box-sizing: border-box !important; }
        table { width: 100% !important; }
        img { height: auto; }
    </style>
    ${html}
`;

// The iframe never auto-sizes to its srcDoc content, so without this it's
// stuck at a fixed height and shows its own internal scrollbar instead of
// just being as tall as the email actually is. `allow-same-origin` (without
// allow-scripts) only lets us read that height from the parent — the email
// HTML still can't execute any script either way.
const EmailBodyFrame = ({ bodyHtml, bodyText, resetKey }: { bodyHtml: string | null; bodyText: string | null; resetKey: number }) => {
    const [height, setHeight] = useState(260);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const responsiveBodyHtml = useMemo(
        () => (bodyHtml ? buildResponsiveEmailHtml(bodyHtml) : undefined),
        [bodyHtml],
    );

    useEffect(() => {
        setHeight(260);
    }, [resetKey]);

    const onLoad = () => {
        const doc = frameRef.current?.contentDocument;
        if (doc?.body) {
            setHeight(Math.max(doc.body.scrollHeight, 120));
        }
    };

    if (!responsiveBodyHtml) {
        return <pre className={cls.bodyText}>{bodyText || '(пустое письмо)'}</pre>;
    }

    return (
        <iframe
            ref={frameRef}
            title="email-body"
            sandbox="allow-same-origin"
            srcDoc={responsiveBodyHtml}
            onLoad={onLoad}
            style={{ height }}
            className={cls.bodyFrame}
        />
    );
};

// Mirrors the server (email-smtp.service.ts resolveReplyRecipient): a reply goes to Reply-To when
// the sender set one — e.g. the visitor behind a website contact form — otherwise to From.
const getReplyRecipient = (message: Pick<EmailMessage, 'fromAddress' | 'replyToAddress'>): string => (
    message.replyToAddress || message.fromAddress
);

const ReplyBox = ({ recipient, isSendingReply, onReply }: {
    recipient: string;
    isSendingReply?: boolean;
    onReply: (html: string, files?: File[]) => Promise<boolean>;
}) => {
    const onComposerReply = async ({ html, files }: EmailComposerSendPayload) => onReply(html, files);

    return (
        <VStack gap="8" max className={cls.replyBox}>
            <Text title="Ответить" size="s" bold />
            <Text text={`Кому: ${recipient}`} size="s" variant="accent" />
            <EmailComposer
                onSend={onComposerReply}
                isSending={isSendingReply}
                sendLabel="Отправить"
                placeholder="Текст ответа..."
            />
        </VStack>
    );
};

export const EmailMessageDetail = memo((props: EmailMessageDetailProps) => {
    const {
        message, isSendingReply, isDeleting, isMarkingAsSpam, onReply, onDelete, onMarkAsSpam,
    } = props;

    const onDeleteClick = () => {
        if (window.confirm('Удалить это письмо? Оно будет перемещено в корзину на почтовом сервере.')) {
            onDelete();
        }
    };

    const onMarkAsSpamClick = () => {
        if (window.confirm('Пометить это письмо как спам?')) {
            onMarkAsSpam();
        }
    };

    return (
        <Card padding="24" fullWidth className={cls.detail}>
            <VStack gap="16" max align="stretch">
                <EmailMessageDetailHeader
                    message={message}
                    isDeleting={isDeleting}
                    isMarkingAsSpam={isMarkingAsSpam}
                    onDeleteClick={onDeleteClick}
                    onMarkAsSpamClick={onMarkAsSpamClick}
                />

                <div className={cls.body}>
                    <EmailBodyFrame
                        bodyHtml={message.bodyHtml ?? null}
                        bodyText={message.bodyText ?? null}
                        resetKey={message.id}
                    />
                </div>

                <EmailMessageAttachments attachments={message.attachments} />

                <ReplyBox recipient={getReplyRecipient(message)} isSendingReply={isSendingReply} onReply={onReply} />
            </VStack>
        </Card>
    );
});
