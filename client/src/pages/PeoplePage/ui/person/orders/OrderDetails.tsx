import { memo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PersonOrder, PersonTicket } from '@/entities/Order';
import { formatDateTime } from '@/shared/lib/format/date';
import { useMoney, useStatus } from '../../../model/useOrderText';
import cls from '@/shared/ui/layout/layout.module.scss';

const Detail = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return (
        <div className={cls.row}>
            <span className={cls.muted}>{t(label)}</span>
            <span>{children}</span>
        </div>
    );
});

// Opens in a new tab without telling the ticket shop which page of the CRM it came from.
const External = memo(({ href, label }: { href: string; label: string }) => {
    const { t } = useTranslation();
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {t(label)}
        </a>
    );
});

// The newsletter question is stored as 1/0; every other answer is shown as given.
const Answers = memo(({ answers }: { answers: PersonOrder['answers'] }) => {
    const { t } = useTranslation();
    const shown = (answer: PersonOrder['answers'][number]) =>
        answer.name === 'keep_me_informed' ? t(answer.value === '1' ? 'Yes' : 'No') : answer.value;
    return (
        <>
            {answers.map((answer) => (
                <div key={answer.name}>
                    {t(`Checkout question: ${answer.name}`, { defaultValue: answer.name })}:{' '}
                    {shown(answer)}
                </div>
            ))}
        </>
    );
});

const TicketRow = memo(({ ticket, currency }: { ticket: PersonTicket; currency: string }) => {
    const { t } = useTranslation();
    const money = useMoney(currency);
    const status = useStatus();
    const paid =
        ticket.price === null
            ? null
            : (Number(ticket.price) + Number(ticket.serviceFee ?? 0)).toFixed(2);
    return (
        <div className={cls.row}>
            <span>
                {ticket.ticketType}
                {ticket.event && (
                    <>
                        {' '}
                        · <Link to={`/events/${ticket.event.id}`}>{ticket.event.name}</Link>
                    </>
                )}
            </span>
            <span>
                {t('Barcode')}: {ticket.barcode || '—'}
            </span>
            <span>
                {status(ticket.status)} · {t(ticket.checkedIn ? 'Checked in' : 'Not checked in')}
            </span>
            <span>
                {t('{{price}} (inc. service: {{fee}})', {
                    price: money(paid),
                    fee: money(ticket.serviceFee),
                })}
            </span>
            {ticket.couponCode && (
                <span className={cls.muted}>
                    {t('Coupon: {{code}}', { code: ticket.couponCode })}
                </span>
            )}
            {ticket.downloadUrl && <External href={ticket.downloadUrl} label="Open ticket" />}
        </div>
    );
});

export const OrderDetails = memo(({ order }: { order: PersonOrder }) => {
    const { t } = useTranslation();
    const money = useMoney(order.currency);
    const status = useStatus();
    return (
        <>
            <Detail label="Total">
                {t('{{total}} (tickets {{subtotal}}, service fee {{fees}})', {
                    total: money(order.total),
                    subtotal: money(order.subtotal),
                    fees: money(order.fees),
                })}
            </Detail>
            <Detail label="Status">{status(order.status)}</Detail>
            {order.shopName && <Detail label="Shop">{order.shopName}</Detail>}
            <Detail label="Placed at">{formatDateTime(order.orderedAt)}</Detail>
            {order.answers.length > 0 && (
                <Detail label="Booker information">
                    <Answers answers={order.answers} />
                </Detail>
            )}
            {order.payments.map((payment) => (
                <Detail key={payment.id} label="Payment">
                    {payment.method || '—'} · {money(payment.amount)} · {status(payment.status)}
                </Detail>
            ))}
            {order.externalId && <Detail label="Order ID">{order.externalId}</Detail>}
            {order.downloadUrl && (
                <div className={cls.actions}>
                    <External
                        href={order.downloadUrl}
                        label="Open the download page of the order"
                    />
                </div>
            )}
            <h3>{t('Tickets')}</h3>
            {order.tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} currency={order.currency} />
            ))}
        </>
    );
});
