import { memo } from 'react';
import { useSelector } from 'react-redux';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { EmailMessageDetail, EmailMessageList } from '@/entities/EmailMessage';
import { useClientEmailBlock } from './useClientEmailBlock';
import s from './ClientEmailBlock.module.scss';

interface ClientEmailBlockProps {
    id: string;
}

const EmailLoadMoreButton = ({ isLoadingMore, onLoadMore }: {
    isLoadingMore: boolean;
    onLoadMore: () => void;
}) => (
    <div className={s.loadMore}>
        <Button
            theme={ButtonTheme.OUTLINE}
            disabled={isLoadingMore}
            onClick={onLoadMore}
        >
            {isLoadingMore ? 'Загрузка...' : 'Загрузить ещё'}
        </Button>
    </div>
);

const EmailEmptySelection = () => (
    <Card padding="24" className={s.emptyState}>
        <Text text="Выберите письмо, чтобы просмотреть его" size="s" />
    </Card>
);

export const ClientEmailBlock = memo(({ id }: ClientEmailBlockProps) => {
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;
    const clientId = Number(id);
    const {
        messages, total, isLoading, isLoadingMore, selectedMessage,
        isSendingReply, isDeleting, isMarkingAsSpam,
        onLoadMore, onSelectMessage, onReply, onDeleteMessage, onMarkMessageAsSpam,
    } = useClientEmailBlock(clientId, isAdmin);

    // The whole email module is ADMIN-only (server enforces it too), so a client
    // without that role simply doesn't see this block on the client card.
    if (!isAdmin) {
        return null;
    }

    return (
        <Card padding="16" fullWidth className={s.card}>
            <VStack gap="8" max>
                <Text title="Письма" size="s" bold />

                {!isLoading && !messages.length ? (
                    <Text text="Переписки с этим клиентом пока нет." size="s" />
                ) : (
                    <HStack gap="16" align="start" max className={s.layout}>
                        <div className={s.list}>
                            <EmailMessageList
                                messages={messages} selectedMessageId={selectedMessage?.id}
                                isLoading={isLoading} onSelect={onSelectMessage}
                            />
                            {!isLoading && messages.length < total && (
                                <EmailLoadMoreButton isLoadingMore={isLoadingMore} onLoadMore={onLoadMore} />
                            )}
                        </div>
                        {selectedMessage ? (
                            <EmailMessageDetail
                                message={selectedMessage} isSendingReply={isSendingReply}
                                isDeleting={isDeleting} isMarkingAsSpam={isMarkingAsSpam}
                                onReply={onReply} onDelete={onDeleteMessage} onMarkAsSpam={onMarkMessageAsSpam}
                            />
                        ) : (
                            <EmailEmptySelection />
                        )}
                    </HStack>
                )}
            </VStack>
        </Card>
    );
});
