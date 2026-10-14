import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getReviewQueue } from '@/entities/Assistant';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProposalCard } from './ProposalCard';

export const ReviewQueuePanel = memo(({ version }: { version: number }) => {
    const { t } = useTranslation();
    const load = useCallback(() => getReviewQueue(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
    const queue = useResource(load);
    const refresh = useCallback(() => {
        void queue.refresh();
    }, [queue]);
    return (
        <Panel>
            <h2>{t('AI Review Queue')}</h2>
            <RequestState error={queue.error} loading={queue.loading} />
            {queue.data && (
                <>
                    <div className={cls.row}>
                        <Link to="/email">{t('Draft replies')}</Link>
                        <strong>{queue.data.drafts.length}</strong>
                    </div>
                    <div className={cls.row}>
                        <span>{t('Low-confidence classifications')}</span>
                        <strong>{queue.data.lowConfidenceDrafts}</strong>
                    </div>
                    <div className={cls.row}>
                        <Link to="/people/duplicates">{t('Duplicate suggestions')}</Link>
                        <strong>{queue.data.duplicates.length}</strong>
                    </div>
                    <h3>{t('Action proposals')}</h3>
                    {queue.data.proposals.length === 0 && (
                        <p className={cls.muted}>{t('Nothing awaits confirmation')}</p>
                    )}
                    {queue.data.proposals.map((item) => (
                        <ProposalCard key={item.id} proposal={item} onDecided={refresh} />
                    ))}
                </>
            )}
        </Panel>
    );
});
