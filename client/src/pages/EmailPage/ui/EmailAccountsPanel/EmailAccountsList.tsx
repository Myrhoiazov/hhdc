import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card/Card';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import type { EmailAccount } from '@/entities/EmailAccount';
import cls from './EmailAccountsPanel.module.scss';

interface EmailAccountsListProps {
    accounts: EmailAccount[];
    syncingAccountId?: number;
    onSync: (accountId: number) => void;
    onDelete: (accountId: number) => void;
}

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : 'ещё не синхронизировано';

export const EmailAccountsList = memo((props: EmailAccountsListProps) => {
    const { t } = useTranslation();
    const { accounts, syncingAccountId, onSync, onDelete } = props;

    return (
        <Card padding="24" fullWidth>
            <VStack gap="16" max>
                <Text title={t('Подключённые аккаунты')} size="s" bold className={cls.sectionTitle} />
                {!accounts.length ? <Text text={t('Ящиков пока нет — добавьте первый выше.')} size="s" /> : (
                    <div className={cls.table}>
                        <div className={cls.tableHeader}>
                            <span>{t('Метка')}</span><span>{t('Host')}</span><span>{t('User')}</span><span>{t('Синхронизация')}</span><span />
                        </div>
                        {accounts.map((account) => <EmailAccountRow key={account.id} account={account} syncingAccountId={syncingAccountId} onSync={onSync} onDelete={onDelete} />)}
                    </div>
                )}
            </VStack>
        </Card>
    );
});

interface EmailAccountRowProps extends Omit<EmailAccountsListProps, 'accounts'> { account: EmailAccount; }

const EmailAccountRow = ({ account, syncingAccountId, onSync, onDelete }: EmailAccountRowProps) => {
    const { t } = useTranslation();
    const isSyncing = syncingAccountId === account.id;

    return (
        <div className={cls.tableRow}>
            <span className={cls.rowLabel}>{account.label}</span>
            <span className={cls.rowHost}>{account.imapHost}</span>
            <span className={cls.rowHost}>{account.username}</span>
            <span className={cls.rowMeta}>{formatDate(account.lastSyncedAt)}</span>
            <HStack gap="4" justify="end">
                <Button theme={ButtonTheme.OUTLINE} disabled={isSyncing} onClick={() => onSync(account.id)}>{isSyncing ? 'Синхронизация...' : 'Sync'}</Button>
                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onDelete(account.id)} aria-label={t('Отключить ящик')}>{t('✕')}</Button>
            </HStack>
        </div>
    );
};
