import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listTicketTypes } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { useNumbers } from '@/shared/lib/format/useNumbers';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

// What the event sells, as read from the ticketing provider; prices are not edited in the CRM.
export const EventTicketTypes = memo(({ eventId }: { eventId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listTicketTypes(eventId), [eventId]);
    const types = useResource(load);
    const { money } = useNumbers(types.data?.[0]?.currency);
    return (
        <Panel id="event-ticket-types" aria-label={t('Ticket types')}>
            <h2>{t('Ticket types')}</h2>
            <RequestState error={types.error} loading={types.loading} />
            {types.data?.map((type) => (
                <div className={cls.row} key={type.id}>
                    <span>{type.name}</span>
                    <span>{money(type.price)}</span>
                    <span>{t('Sold: {{count}}', { count: type.soldCount })}</span>
                    <span className={cls.muted}>
                        {t(`Ticket status: ${type.status}`, { defaultValue: type.status })}
                    </span>
                </div>
            ))}
            {types.data?.length === 0 && <p className={cls.muted}>{t('No ticket types yet')}</p>}
        </Panel>
    );
});
