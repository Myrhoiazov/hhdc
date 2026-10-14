import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AiProposal, decideProposal } from '@/entities/Assistant';
import { formatDate } from '@/shared/lib/format/date';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import cls from '@/shared/ui/layout/layout.module.scss';

// A proposal changes nothing until the staff member confirms it here.
export const ProposalCard = memo(
    ({ proposal, onDecided }: { proposal: AiProposal; onDecided: () => void }) => {
        const { t } = useTranslation();
        const action = useAction(onDecided);
        return (
            <div className={cls.result}>
                <h3>{t('Create task?')}</h3>
                <p>
                    <strong>{proposal.payload.title}</strong>
                </p>
                {proposal.payload.description && <p>{proposal.payload.description}</p>}
                {proposal.payload.dueDate && (
                    <p className={cls.muted}>
                        {t('Due')}: {formatDate(proposal.payload.dueDate)}
                    </p>
                )}
                <RequestState error={action.error} loading={false} />
                <div className={cls.actions}>
                    <Button
                        disabled={action.busy}
                        onClick={() => void action.run(() => decideProposal(proposal.id, 'reject'))}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button
                        disabled={action.busy}
                        onClick={() =>
                            void action.run(() => decideProposal(proposal.id, 'confirm'))
                        }
                    >
                        {t('Confirm')}
                    </Button>
                </div>
            </div>
        );
    }
);
