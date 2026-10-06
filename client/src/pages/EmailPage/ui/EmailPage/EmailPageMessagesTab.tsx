import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { EmailAccount } from '@/entities/EmailAccount';
import { EmailMessage, EmailMessageDetail, EmailMessageList } from '@/entities/EmailMessage';
import cls from './EmailPage.module.scss';

interface EmailPageMessagesTabProps {
    accounts: EmailAccount[];
    selectedMailboxId?: number;
    onSelectMailbox: (mailboxId?: number) => void;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    messages: EmailMessage[];
    selectedMessage?: EmailMessage;
    isLoadingMessages: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    onSelectMessage: (message: EmailMessage) => void;
    onLoadMore: () => void;
    isSendingReply: boolean;
    isDeleting: boolean;
    isMarkingAsSpam: boolean;
    onReply: (html: string, files?: File[]) => Promise<boolean>;
    onDeleteMessage: () => void;
    onMarkMessageAsSpam: () => void;
}

const MailboxFilters = ({
    accounts,
    selectedMailboxId,
    onSelectMailbox,
    searchInput,
    onSearchInputChange,
}: {
    accounts: EmailAccount[];
    selectedMailboxId?: number;
    onSelectMailbox: (mailboxId?: number) => void;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <HStack gap="16" align="center" max wrap="wrap">
            <div className={cls.mailboxFilter}>
                <button
                    type="button"
                    className={classNames(cls.filterChip, { [cls.filterChipActive]: selectedMailboxId === undefined })}
                    onClick={() => onSelectMailbox(undefined)}
                >
                    {t('Все ящики')}
                </button>
                {accounts.map((account) => (
                    <button
                        key={account.id}
                        type="button"
                        className={classNames(cls.filterChip, { [cls.filterChipActive]: selectedMailboxId === account.id })}
                        onClick={() => onSelectMailbox(account.id)}
                    >
                        {account.label}
                    </button>
                ))}
            </div>

            <Input
                size="s"
                placeholder={t('Поиск по теме, отправителю, тексту...')}
                value={searchInput}
                onChange={onSearchInputChange}
                className={cls.searchInput}
            />
        </HStack>
    );
};

const MessageListColumn = ({
    messages,
    selectedMessage,
    isLoadingMessages,
    isLoadingMore,
    hasMore,
    onSelectMessage,
    onLoadMore,
}: {
    messages: EmailMessage[];
    selectedMessage?: EmailMessage;
    isLoadingMessages: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    onSelectMessage: (message: EmailMessage) => void;
    onLoadMore: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <Card padding="0" shadow="shadowLight" className={cls.messageColumn}>
            <EmailMessageList
                messages={messages}
                selectedMessageId={selectedMessage?.id}
                isLoading={isLoadingMessages}
                onSelect={onSelectMessage}
            />
            {!isLoadingMessages && hasMore && (
                <div className={cls.loadMore}>
                    <Button
                        theme={ButtonTheme.OUTLINE}
                        disabled={isLoadingMore}
                        onClick={onLoadMore}
                    >
                        {isLoadingMore ? t('Загрузка...') : t('Загрузить ещё')}
                    </Button>
                </div>
            )}
        </Card>
    );
};

const MessageDetailPane = ({
    message,
    isSendingReply,
    isDeleting,
    isMarkingAsSpam,
    onReply,
    onDelete,
    onMarkAsSpam,
}: {
    message?: EmailMessage;
    isSendingReply: boolean;
    isDeleting: boolean;
    isMarkingAsSpam: boolean;
    onReply: (html: string, files?: File[]) => Promise<boolean>;
    onDelete: () => void;
    onMarkAsSpam: () => void;
}) => {
    if (!message) {
        return (
            <Card padding="24" shadow="shadowLight" className={cls.emptyState}>
                <Text text="Выберите письмо, чтобы просмотреть его" size="s" />
            </Card>
        );
    }
    return (
        <EmailMessageDetail
            message={message}
            isSendingReply={isSendingReply}
            isDeleting={isDeleting}
            isMarkingAsSpam={isMarkingAsSpam}
            onReply={onReply}
            onDelete={onDelete}
            onMarkAsSpam={onMarkAsSpam}
        />
    );
};

export const EmailPageMessagesTab = memo((props: EmailPageMessagesTabProps) => {
    const {
        accounts, selectedMailboxId, onSelectMailbox, searchInput, onSearchInputChange,
        messages, selectedMessage, isLoadingMessages, isLoadingMore, hasMore, onSelectMessage, onLoadMore,
        isSendingReply, isDeleting, isMarkingAsSpam, onReply, onDeleteMessage, onMarkMessageAsSpam,
    } = props;

    return (
        <VStack gap="8" max>
            <MailboxFilters
                accounts={accounts}
                selectedMailboxId={selectedMailboxId}
                onSelectMailbox={onSelectMailbox}
                searchInput={searchInput}
                onSearchInputChange={onSearchInputChange}
            />

            <HStack gap="16" align="start" max className={cls.layout}>
                <MessageListColumn
                    messages={messages}
                    selectedMessage={selectedMessage}
                    isLoadingMessages={isLoadingMessages}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                    onSelectMessage={onSelectMessage}
                    onLoadMore={onLoadMore}
                />

                <MessageDetailPane
                    message={selectedMessage}
                    isSendingReply={isSendingReply}
                    isDeleting={isDeleting}
                    isMarkingAsSpam={isMarkingAsSpam}
                    onReply={onReply}
                    onDelete={onDeleteMessage}
                    onMarkAsSpam={onMarkMessageAsSpam}
                />
            </HStack>
        </VStack>
    );
});
