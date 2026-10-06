import { memo } from 'react';
import { VStack } from '@/shared/ui/Stack';
import type { CreateEmailAccountPayload, EmailAccount } from '@/entities/EmailAccount';
import { EmailAccountCreateForm } from './EmailAccountCreateForm';
import { EmailAccountsList } from './EmailAccountsList';
import { useEmailAccountForm } from './useEmailAccountForm';

interface EmailAccountsPanelProps {
    accounts: EmailAccount[];
    syncingAccountId?: number;
    onSync: (accountId: number) => void;
    onDelete: (accountId: number) => void;
    onCreate: (payload: CreateEmailAccountPayload) => Promise<string | undefined>;
}

export const EmailAccountsPanel = memo((props: EmailAccountsPanelProps) => {
    const { accounts, syncingAccountId, onSync, onDelete, onCreate } = props;
    const form = useEmailAccountForm(onCreate);

    return (
        <VStack gap="16" max>
            <EmailAccountCreateForm {...form} />
            <EmailAccountsList accounts={accounts} syncingAccountId={syncingAccountId} onSync={onSync} onDelete={onDelete} />
        </VStack>
    );
});
