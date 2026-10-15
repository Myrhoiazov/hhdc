import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { ConversationDetail } from '@/widgets/ConversationThread';
import { useMailTools } from '../../../model/useMailTools';
import own from './PersonConversations.module.scss';

interface OpenThreadProps {
    id: string;
    tools: ReturnType<typeof useMailTools>;
    onClose: () => void;
    onRemoved: () => void;
}

export const OpenThread = memo(({ id, tools, onClose, onRemoved }: OpenThreadProps) => {
    const { t } = useTranslation();
    return (
        <div className={own.detail}>
            <div className={own.detailBar}>
                <Button onClick={onClose}>{t('Close the conversation')}</Button>
            </div>
            <ConversationDetail
                id={id}
                providers={tools.mailboxes}
                aiProviders={tools.aiProviders}
                replyPrompts={tools.replyPrompts}
                preferredProviderId=""
                onBack={onClose}
                onRemoved={onRemoved}
            />
        </div>
    );
});
