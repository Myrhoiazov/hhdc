import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from '@/entities/Person';
import { formatDateTime } from '@/shared/lib/format/date';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './PersonPage.module.scss';

export const PersonActivity = memo(({ activity }: { activity: Activity[] | undefined }) => {
    const { t } = useTranslation();
    return (
        <>
            {activity?.map((item) => (
                <div className={cls.row} key={item.id}>
                    <span className={own.activityType}>{t(item.type)}</span>
                    <time className={own.activityTime}>{formatDateTime(item.createdAt)}</time>
                </div>
            ))}
            {activity?.length === 0 && <p className={cls.muted}>{t('No activity yet')}</p>}
        </>
    );
});
