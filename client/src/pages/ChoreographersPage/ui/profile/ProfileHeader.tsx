import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerDetail } from '@/entities/Choreographer';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ChoreographerAvatar } from '../ChoreographerAvatar';
import { choreographerName } from '../../model/choreographerName';
import own from '../Choreographers.module.scss';

export const ProfileHeader = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { person, profile, summary } = detail;
    const location = [profile.city, profile.countryCode].filter(Boolean).join(', ');
    return (
        <header className={own.header}>
            <div className={own.headerTop}>
                <div className={own.identity}>
                    <ChoreographerAvatar
                        personId={person.id}
                        photoId={detail.coverPhotoId}
                        name={choreographerName(detail)}
                        large
                    />
                    <div>
                        <h2>{choreographerName(detail)}</h2>
                        {profile.stageName && (
                            <div className={own.secondary}>{person.displayName}</div>
                        )}
                        {location && <div className={own.secondary}>{location}</div>}
                    </div>
                </div>
                <StatusBadge status={profile.relationshipStatus} />
            </div>
            {profile.styles.length > 0 && (
                <div className={own.chips} aria-label={t('Dance styles')}>
                    {profile.styles.map((style) => (
                        <span key={style} className={own.chip}>
                            {style}
                        </span>
                    ))}
                </div>
            )}
            <div className={own.chips}>
                <span className={own.chip}>{`${t('Events')}: ${summary.totalAssignments}`}</span>
                {summary.lastEventYear && (
                    <span
                        className={own.chip}
                    >{`${t('Last event')}: ${summary.lastEventYear}`}</span>
                )}
                {summary.upcomingEvent && (
                    <span
                        className={own.chip}
                    >{`${t('Upcoming')}: ${summary.upcomingEvent.name}`}</span>
                )}
                <span className={own.chip}>{`${t('Open tasks')}: ${summary.openTasks ?? 0}`}</span>
            </div>
        </header>
    );
});
