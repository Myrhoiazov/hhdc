import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import { HStack, VStack } from '@/shared/ui/Stack';
import { EmailAccountsPanel } from '../EmailAccountsPanel/EmailAccountsPanel';
import { ComposeEmailModal } from '../ComposeEmailModal/ComposeEmailModal';
import { useEmailPage, EmailTab } from './useEmailPage';
import { EmailPageMessagesTab } from './EmailPageMessagesTab';
import cls from './EmailPage.module.scss';

const ForbiddenAccess = () => (
    <Page>
        <Text title="Доступ запрещён" text="Модуль почты доступен только администраторам." size="m" bold />
    </Page>
);

const PageHeader = ({ hasAccounts, onCompose }: { hasAccounts: boolean; onCompose: () => void }) => {
    const { t } = useTranslation();
    return (
        <HStack justify="between" align="center" max>
            <Text title="Почта" size="l" bold />
            <Button
                theme={ButtonTheme.BACKGROUND_INVERTED}
                disabled={!hasAccounts}
                onClick={onCompose}
            >
                {t('Написать письмо')}
            </Button>
        </HStack>
    );
};

const TabBar = ({ activeTab, onSelect }: { activeTab: EmailTab; onSelect: (tab: EmailTab) => void }) => {
    const { t } = useTranslation();
    const tabs: { key: EmailTab; label: string }[] = [
        { key: 'accounts', label: t('Аккаунты') },
        { key: 'messages', label: t('Письма') },
    ];

    return (
        <div className={cls.tabBar} role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={classNames(cls.tab, { [cls.tabActive]: activeTab === tab.key })}
                    onClick={() => onSelect(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

type EmailPageState = ReturnType<typeof useEmailPage>;

const EmailPageBody = (state: EmailPageState) => {
    const {
        activeTab, setActiveTab, accounts, selectedMailboxId, setSelectedMailboxId, syncingAccountId,
        searchInput, setSearchInput, messages, isLoadingMessages, isLoadingMore, selectedMessage,
        isSendingReply, isDeleting, isMarkingAsSpam, isComposeOpen, setIsComposeOpen, isSendingCompose,
        hasMore, onCreateAccount, onDeleteAccount, onSyncAccount, onSelectMessage, onReply,
        onDeleteMessage, onMarkMessageAsSpam, onSendCompose, onLoadMore,
    } = state;

    return (
        <Page>
            <VStack gap="16" max className={cls.EmailPage}>
                <PageHeader hasAccounts={accounts.length > 0} onCompose={() => setIsComposeOpen(true)} />

                <TabBar activeTab={activeTab} onSelect={setActiveTab} />

                {activeTab === 'accounts' && (
                    <EmailAccountsPanel
                        accounts={accounts} syncingAccountId={syncingAccountId}
                        onSync={onSyncAccount} onDelete={onDeleteAccount} onCreate={onCreateAccount}
                    />
                )}

                {activeTab === 'messages' && (
                    <EmailPageMessagesTab
                        accounts={accounts} selectedMailboxId={selectedMailboxId} onSelectMailbox={setSelectedMailboxId}
                        searchInput={searchInput} onSearchInputChange={setSearchInput}
                        messages={messages} selectedMessage={selectedMessage}
                        isLoadingMessages={isLoadingMessages} isLoadingMore={isLoadingMore} hasMore={hasMore}
                        onSelectMessage={onSelectMessage} onLoadMore={onLoadMore}
                        isSendingReply={isSendingReply} isDeleting={isDeleting} isMarkingAsSpam={isMarkingAsSpam}
                        onReply={onReply} onDeleteMessage={onDeleteMessage} onMarkMessageAsSpam={onMarkMessageAsSpam}
                    />
                )}
            </VStack>

            <ComposeEmailModal
                isOpen={isComposeOpen} accounts={accounts} isSending={isSendingCompose}
                onClose={() => setIsComposeOpen(false)} onSend={onSendCompose}
            />
        </Page>
    );
};

const EmailPage = memo(() => {
    const state = useEmailPage();

    if (!state.isAdmin) return <ForbiddenAccess />;
    return <EmailPageBody {...state} />;
});

export default EmailPage;
