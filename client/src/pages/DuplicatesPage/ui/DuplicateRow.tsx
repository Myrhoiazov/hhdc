import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DuplicateCandidate, mergePeople, resolveDuplicate } from '@/entities/Duplicate';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { Badge } from '@/shared/ui/Badge';
import cls from '@/shared/ui/layout/layout.module.scss';

export const DuplicateRow = memo(
    ({ candidate, refresh }: { candidate: DuplicateCandidate; refresh: () => void }) => {
        const { t } = useTranslation();
        const action = useAction(refresh);
        const { personA, personB } = candidate;
        if (!personA || !personB) return null;
        // Merging is always an explicit human decision: the first person is kept, the second archived.
        const merge = () => {
            if (!window.confirm(t('Merge these two people? The second record will be archived.')))
                return;
            void action.run(() => mergePeople(personA.id, personB.id));
        };
        return (
            <div>
                <div className={cls.row}>
                    <span>
                        <Link to={`/people/${personA.id}`}>{personA.displayName}</Link> ·{' '}
                        {personA.email || personA.phone}
                    </span>
                    <span>
                        <Link to={`/people/${personB.id}`}>{personB.displayName}</Link> ·{' '}
                        {personB.email || personB.phone}
                    </span>
                    <Badge>{`${Math.round(candidate.score * 100)}% · ${candidate.reasons.map((reason) => t(reason)).join(', ')}`}</Badge>
                    <div className={cls.actions}>
                        <Button disabled={action.busy} onClick={merge}>
                            {t('Merge')}
                        </Button>
                        <Button
                            disabled={action.busy}
                            onClick={() =>
                                void action.run(() =>
                                    resolveDuplicate(candidate.id, 'NOT_DUPLICATE')
                                )
                            }
                        >
                            {t('Not a duplicate')}
                        </Button>
                    </div>
                </div>
                <RequestState error={action.error} loading={false} />
            </div>
        );
    }
);
