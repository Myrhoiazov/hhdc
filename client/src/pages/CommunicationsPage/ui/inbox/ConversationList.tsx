import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/entities/Conversation';
import { classNames } from '@/shared/lib/classNames/classNames';
import { ConversationSelection } from '../../model/useConversationSelection';
import cls from './Inbox.module.scss';
import { ConversationListItem } from './ConversationListItem';

const ListHeading = memo(
    ({
        loaded,
        total,
        selection,
    }: {
        loaded: number;
        total: number;
        selection: ConversationSelection;
    }) => {
        const { t } = useTranslation();
        return (
            <div className={cls.listHeading}>
                <label className={cls.selectAll}>
                    <input
                        type="checkbox"
                        className={cls.rowCheckbox}
                        checked={selection.allSelected}
                        disabled={!loaded}
                        onChange={selection.toggleAll}
                        aria-label={t('Select all loaded conversations')}
                    />
                    <strong>{t('Letters')}</strong>
                </label>
                <span>
                    {loaded} / {total}
                </span>
            </div>
        );
    }
);

interface ConversationListProps {
    // Laid on the root by the workspace, e.g. to hide the list on a phone while a letter is open.
    className?: string;
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
    loadingMore: boolean;
    selectedId: string;
    selection: ConversationSelection;
    onSelect: (id: string) => void;
    onLoadMore: () => void;
    // The bulk actions bar, shown between the heading and the letters.
    children?: ReactNode;
}

export const ConversationList = memo((props: ConversationListProps) => {
    const {
        conversations,
        total,
        hasMore,
        loadingMore,
        selectedId,
        selection,
        onSelect,
        onLoadMore,
        children,
    } = props;
    const { t } = useTranslation();
    return (
        <aside
            className={classNames(cls.conversationList, {}, [props.className])}
            aria-label={t('Letters')}
        >
            <ListHeading loaded={conversations.length} total={total} selection={selection} />
            {children}
            <div className={cls.listScroll}>
                {conversations.map((conversation) => (
                    <ConversationListItem
                        key={conversation.id}
                        conversation={conversation}
                        selected={selectedId === conversation.id}
                        checked={selection.selectedIds.includes(conversation.id)}
                        onSelect={onSelect}
                        onToggle={selection.toggle}
                    />
                ))}
                {hasMore && (
                    <button className={cls.loadMore} disabled={loadingMore} onClick={onLoadMore}>
                        {t(loadingMore ? 'Loading…' : 'Load more')}
                    </button>
                )}
            </div>
            {!conversations.length && (
                <p className={cls.emptyList}>{t('No conversations found')}</p>
            )}
        </aside>
    );
});
