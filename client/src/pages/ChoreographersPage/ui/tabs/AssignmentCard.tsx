import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ASSIGNMENT_STATUSES,
    AssignmentStatus,
    AssignmentUpdate,
    ChoreographerHistoryItem,
    LOGISTICS_STATUSES,
    LogisticsStatus,
} from '@/entities/Choreographer';
import { formatLongDate } from '@/shared/lib/format/date';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import own from '../Choreographers.module.scss';

const StatusSelect = memo(
    ({
        label,
        value,
        options,
        onChange,
    }: {
        label: string;
        value: string;
        options: readonly string[];
        onChange: (value: string) => void;
    }) => {
        const { t } = useTranslation();
        return (
            <label className={own.inlineSelect}>
                {t(label)}
                <select value={value} onChange={(event) => onChange(event.target.value)}>
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {t(option)}
                        </option>
                    ))}
                </select>
            </label>
        );
    }
);

export const AssignmentCard = memo(
    ({
        item,
        canManage,
        onUpdate,
    }: {
        item: ChoreographerHistoryItem;
        canManage: boolean;
        onUpdate: (id: string, input: AssignmentUpdate) => void;
    }) => {
        const { t } = useTranslation();
        return (
            <article className={own.assignment} aria-label={item.event.name}>
                <div className={own.headerTop}>
                    <div>
                        <Link to={`/events/${item.event.id}`}>{item.event.name}</Link>
                        <div className={own.secondary}>
                            {[
                                `${formatLongDate(item.event.startAt)} – ${formatLongDate(item.event.endAt)}`,
                                item.event.city,
                                item.roleTitle,
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </div>
                    </div>
                    <span className={own.chips}>
                        <span className={own.chip}>{t(`TIMING_${item.timing}`)}</span>
                        <StatusBadge status={item.status} />
                    </span>
                </div>
                {item.sessions.length > 0 && (
                    <div
                        className={own.secondary}
                    >{`${t('Sessions')}: ${item.sessions.map((session) => session.name).join(', ')}`}</div>
                )}
                {item.notes && <p className={own.bio}>{item.notes}</p>}
                {canManage ? (
                    <div className={own.controls}>
                        <StatusSelect
                            label="Participation"
                            value={item.status}
                            options={ASSIGNMENT_STATUSES}
                            onChange={(status) =>
                                onUpdate(item.id, { status: status as AssignmentStatus })
                            }
                        />
                        <StatusSelect
                            label="Travel"
                            value={item.travelStatus}
                            options={LOGISTICS_STATUSES}
                            onChange={(travelStatus) =>
                                onUpdate(item.id, { travelStatus: travelStatus as LogisticsStatus })
                            }
                        />
                        <StatusSelect
                            label="Hotel"
                            value={item.hotelStatus}
                            options={LOGISTICS_STATUSES}
                            onChange={(hotelStatus) =>
                                onUpdate(item.id, { hotelStatus: hotelStatus as LogisticsStatus })
                            }
                        />
                    </div>
                ) : (
                    <div
                        className={own.secondary}
                    >{`${t('Travel')}: ${t(item.travelStatus)} · ${t('Hotel')}: ${t(item.hotelStatus)}`}</div>
                )}
            </article>
        );
    }
);
