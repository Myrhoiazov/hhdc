import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Card } from '@/shared/ui/Card/Card';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { getClientDetailsData } from '../../model/selectors/clientDetails';
import s from './ClientDetails.module.scss';

const formatEventDate = (value?: string) => {
    if (!value) return 'Дата неизвестна';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

export const MollieClientEventsTimeline = memo(() => {
    const client = useSelector(getClientDetailsData);

    return (
        <Card padding="24" fullWidth className={s.detailsCard}>
            <VStack gap="16" max>
                <div><Text title="История событий Mollie" size="s" bold /><Text text="Последние webhook-события по платежам этого профиля" size="s" className={s.subtitle} /></div>
                {client?.events?.length ? <div className={s.timeline}>{client.events.map((event) => <MollieEventItem key={event.id} event={event} />)}</div> : <Text text="Webhook-событий пока нет" size="s" className={s.subtitle} />}
            </VStack>
        </Card>
    );
});

type MollieEvent = NonNullable<NonNullable<ReturnType<typeof getClientDetailsData>>['events']>[number];

const MollieEventItem = ({ event }: { event: MollieEvent }) => {
    const { t } = useTranslation();
    const markerClass = event.processingStatus === 'failed' ? s.timelineMarkerFailed : s.timelineMarkerProcessed;

    return (
        <div className={s.timelineItem}>
            <span className={`${s.timelineMarker} ${markerClass}`} />
            <div className={s.timelineContent}>
                <div className={s.timelineHeader}>
                    <span className={s.timelineTitle}>{t('Платёж {{status}}', { status: event.paymentStatus || 'получен' })}</span>
                    <span className={s.timelineDate}>{formatEventDate(event.receivedAt)}</span>
                </div>
                <span className={s.timelineMeta}>{event.molliePaymentId} · {event.processingStatus}</span>
                {event.errorMessage && <span className={s.timelineError}>{event.errorMessage}</span>}
            </div>
        </div>
    );
};
