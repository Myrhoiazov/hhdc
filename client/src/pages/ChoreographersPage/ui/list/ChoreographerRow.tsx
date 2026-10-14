import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChoreographerListItem } from '@/entities/Choreographer';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ChoreographerAvatar } from '../ChoreographerAvatar';
import own from '../Choreographers.module.scss';
import { choreographerName } from '../../model/choreographerName';

const SummaryChips = memo(({ item }: { item: ChoreographerListItem }) => {
    const { t } = useTranslation();
    const { summary } = item;
    return (
        <span className={own.chips}>
            <span className={own.chip}>{`${t('Events')}: ${summary.totalAssignments}`}</span>
            {summary.lastEventYear && (
                <span className={own.chip}>{`${t('Last event')}: ${summary.lastEventYear}`}</span>
            )}
            {summary.upcomingEvent && (
                <span
                    className={own.chip}
                >{`${t('Upcoming')}: ${summary.upcomingEvent.name}`}</span>
            )}
        </span>
    );
});

export const ChoreographerRow = memo(({ item }: { item: ChoreographerListItem }) => (
    <div className={own.listRow}>
        <span className={own.identity}>
            <ChoreographerAvatar
                personId={item.person.id}
                photoId={item.coverPhotoId}
                name={choreographerName(item)}
            />
            <span>
                <Link to={`/people/choreographers/${item.person.id}`}>
                    {choreographerName(item)}
                </Link>
                {item.profile?.stageName && (
                    <div className={own.secondary}>{item.person.displayName}</div>
                )}
            </span>
        </span>
        <span className={own.secondary}>
            {[item.person.email, item.profile?.styles.join(', ')].filter(Boolean).join(' · ')}
        </span>
        <span className={own.chips}>
            {item.profile && <StatusBadge status={item.profile.relationshipStatus} />}
            <SummaryChips item={item} />
        </span>
    </div>
));
