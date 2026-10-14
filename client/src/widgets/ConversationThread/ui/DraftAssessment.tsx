import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Draft } from '@/entities/Conversation';
import cls from './ConversationThread.module.scss';
import { MailBadge } from '@/shared/ui/MailBadge';

// What the assistant thinks of its own draft: whether a person must check the facts, and why.
export const DraftAssessment = memo(({ draft }: { draft: Draft }) => {
    const { t } = useTranslation();
    const snapshot = draft.contextSnapshot;
    if (!snapshot && draft.confidence == null) return null;
    const review = snapshot?.needsStaffReview ?? false;
    return (
        <div className={cls.draftAssessment}>
            <MailBadge tone={review ? 'review' : 'new'}>
                {t(review ? 'Needs staff review' : 'Ready for approval')}
            </MailBadge>
            {snapshot?.answerability && (
                <MailBadge tone="opened">{t(snapshot.answerability)}</MailBadge>
            )}
            {draft.confidence != null && (
                <MailBadge tone="opened">
                    {t('Confidence')}: {Math.round(draft.confidence * 100)}%
                </MailBadge>
            )}
            {Boolean(snapshot?.warnings?.length) && (
                <small>{snapshot?.warnings?.join(' · ')}</small>
            )}
        </div>
    );
});
