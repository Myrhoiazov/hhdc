import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Invoice, InvoiceAuditLog, InvoiceStatus } from '../../model/types';
import { statusLabel } from '../../model/consts';
import { InvoiceAction } from '../InvoiceActionModal/InvoiceActionModal';
import s from './InvoicesPage.module.scss';

const documentLabel = {
    INVOICE: 'Инвойс',
    CREDIT_NOTE: 'Кредит-нота',
    DEBIT_NOTE: 'Корректировка',
};

const actionLabel: Record<string, string> = {
    CREATED: 'Документ создан',
    CREATED_PAID: 'Создан оплаченный инвойс',
    DRAFT_CONFIRMED_PAID: 'Черновик подтверждён как оплаченный',
    UPDATED: 'Документ изменён',
    STATUS_CHANGED: 'Статус изменён',
    CANCELLED: 'Документ отменён',
    PAYMENT_RECORDED: 'Оплата зарегистрирована',
    CREDIT_NOTE_APPLIED: 'Применена кредит-нота',
    DEBIT_NOTE_CREATED: 'Создана дебетовая корректировка',
    MARKED_OVERDUE: 'Отмечен как просроченный',
    MOLLIE_PAYMENT_LINK_CREATED: 'Создана ссылка Mollie',
    MOLLIE_RECONCILED: 'Оплата синхронизирована с Mollie',
    CANCELLATION_ROLLED_BACK: 'Отмена инвойса откачена',
};

const money = (cents: number) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
}).format(cents / 100);

const actorName = (log: InvoiceAuditLog) => (
    [log.actor?.firstName, log.actor?.lastName].filter(Boolean).join(' ') || log.actor?.email || 'Система'
);

const canEdit = (invoice: Invoice) => (
    invoice.documentType === 'INVOICE'
    && !['PAID', 'CANCELLED'].includes(invoice.status)
    && invoice.paidAmountCents === 0
    && invoice.creditedAmountCents === 0
);

interface InvoiceListItemProps {
    invoice: Invoice;
    onEdit: (invoice: Invoice) => void;
    onPreviewPdf: (invoice: Invoice) => void;
    onDownloadPdf: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    onCreateMolliePaymentLink: (invoice: Invoice) => void;
    onSetActiveAction: (action: InvoiceAction) => void;
    onUpdateStatus: (invoice: Invoice, status: Extract<InvoiceStatus, 'ISSUED' | 'CANCELLED'>) => void;
}

const Amounts = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <div className={s.amounts}>
            <strong>{money(invoice.totalCents)}</strong>
            {invoice.documentType !== 'CREDIT_NOTE' && (
                <span>
                    {t('Оплачено {{amount}}', { amount: money(invoice.paidAmountCents) })}
                    {invoice.creditedAmountCents > 0 && ` · Зачтено ${money(invoice.creditedAmountCents)}`}
                    {' · '}{t('Долг {{amount}}', { amount: money(invoice.balanceDueCents) })}
                </span>
            )}
            {invoice.paymentReference && (
                <span>{t('Ref: {{reference}}', { reference: invoice.paymentReference })}</span>
            )}
        </div>
    );
};

interface ActionsProps {
    invoice: Invoice;
    editable: boolean;
    onEdit: (invoice: Invoice) => void;
    onPreviewPdf: (invoice: Invoice) => void;
    onDownloadPdf: (invoice: Invoice) => void;
    onSendEmail: (invoice: Invoice) => void;
    onCreateMolliePaymentLink: (invoice: Invoice) => void;
    onSetActiveAction: (action: InvoiceAction) => void;
    onUpdateStatus: (invoice: Invoice, status: Extract<InvoiceStatus, 'ISSUED' | 'CANCELLED'>) => void;
}

const MollieAndPaymentActions = ({ invoice, onCreateMolliePaymentLink, onSetActiveAction }: {
    invoice: Invoice;
    onCreateMolliePaymentLink: (invoice: Invoice) => void;
    onSetActiveAction: (action: InvoiceAction) => void;
}) => {
    const { t } = useTranslation();
    if (invoice.documentType === 'CREDIT_NOTE' || invoice.balanceDueCents <= 0 || ['DRAFT', 'CANCELLED'].includes(invoice.status)) {
        return null;
    }
    return (
        <>
            <button onClick={() => onCreateMolliePaymentLink(invoice)}>
                {invoice.molliePaymentLinks.some((l) => !l.archived && !l.paidAt) ? 'Оплатить Mollie' : 'Mollie link'}
            </button>
            <button onClick={() => onSetActiveAction({ type: 'record-payment', invoice })}>
                {t('Добавить оплату')}
            </button>
        </>
    );
};

const AdjustmentActions = ({ invoice, onSetActiveAction }: {
    invoice: Invoice;
    onSetActiveAction: (action: InvoiceAction) => void;
}) => {
    const { t } = useTranslation();
    if (invoice.documentType !== 'INVOICE' || ['DRAFT', 'CANCELLED'].includes(invoice.status)) return null;
    return (
        <>
            <button onClick={() => onSetActiveAction({ type: 'create-credit', invoice })}>{t('Кредит-нота')}</button>
            <button onClick={() => onSetActiveAction({ type: 'create-debit', invoice })}>{t('Корректировка')}</button>
        </>
    );
};

const LifecycleActions = ({ invoice, editable, onUpdateStatus, onSetActiveAction }: {
    invoice: Invoice;
    editable: boolean;
    onUpdateStatus: (invoice: Invoice, status: Extract<InvoiceStatus, 'ISSUED' | 'CANCELLED'>) => void;
    onSetActiveAction: (action: InvoiceAction) => void;
}) => {
    const { t } = useTranslation();
    if (!editable) return null;
    return (
        <>
            {invoice.status === 'DRAFT' && (
                <button onClick={() => onUpdateStatus(invoice, 'ISSUED')}>{t('Выдать')}</button>
            )}
            {invoice.status === 'DRAFT' && (
                <button className={s.confirmPaid} onClick={() => onSetActiveAction({ type: 'confirm-paid', invoice })}>
                    {t('Подтвердить как оплаченный')}
                </button>
            )}
            <button className={s.cancel} onClick={() => onSetActiveAction({ type: 'cancel', invoice })}>
                {t('Отменить')}
            </button>
        </>
    );
};

const ActionButtons = (props: ActionsProps) => {
    const {
        invoice, editable, onEdit, onPreviewPdf, onDownloadPdf,
        onSendEmail, onCreateMolliePaymentLink, onSetActiveAction, onUpdateStatus,
    } = props;
    const { t } = useTranslation();

    return (
        <div className={s.actions}>
            {editable && <button onClick={() => onEdit(invoice)}>{t('Редактировать')}</button>}
            <button onClick={() => onPreviewPdf(invoice)}>{t('Предпросмотр')}</button>
            <button onClick={() => onDownloadPdf(invoice)}>PDF</button>

            {invoice.billToEmail && !['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                <button onClick={() => onSendEmail(invoice)}>
                    {invoice.deliveries.some((d) => d.status === 'SENT') ? 'Отправить снова' : 'Email'}
                </button>
            )}

            <MollieAndPaymentActions
                invoice={invoice} onCreateMolliePaymentLink={onCreateMolliePaymentLink} onSetActiveAction={onSetActiveAction}
            />
            <AdjustmentActions invoice={invoice} onSetActiveAction={onSetActiveAction} />
            <LifecycleActions
                invoice={invoice} editable={editable} onUpdateStatus={onUpdateStatus} onSetActiveAction={onSetActiveAction}
            />
        </div>
    );
};

const MolliePaymentsSection = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <div className={s.mollie}>
            <strong>{t('Mollie:')}</strong>
            {invoice.molliePayments.map((payment) => (
                <span key={payment.id}>
                    {payment.mollieId ?? `#${payment.id}`} · {payment.status}
                    {Number(payment.refundedAmount) > 0 && ` · refund €${Number(payment.refundedAmount).toFixed(2)}`}
                    {Number(payment.chargedBackAmount) > 0 && ` · chargeback €${Number(payment.chargedBackAmount).toFixed(2)}`}
                </span>
            ))}
        </div>
    );
};

const MolliePaymentLinksSection = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <div className={s.mollie}>
            <strong>{t('Mollie links:')}</strong>
            {invoice.molliePaymentLinks.map((link) => (
                <span key={link.id}>
                    {link.mollieId} · {link.archived ? 'archived' : 'active'}
                    {link.expiresAt && ` · до ${new Date(link.expiresAt).toLocaleString('ru-RU')}`}
                </span>
            ))}
        </div>
    );
};

const PaymentsSection = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <div className={s.mollie}>
            <strong>{t('Оплаты:')}</strong>
            {invoice.payments.map((payment) => (
                <span key={payment.id}>
                    {money(payment.amountCents)} · {payment.method} · {new Date(payment.paidAt).toLocaleDateString('ru-RU')}
                    {payment.reference && ` · ${payment.reference}`}
                </span>
            ))}
        </div>
    );
};

const DeliveriesSection = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <details className={s.history}>
            <summary>{t('Отправки ({{count}})', { count: invoice.deliveries.length })}</summary>
            {invoice.deliveries.map((delivery) => (
                <div key={delivery.id}>
                    <span>
                        {delivery.type} · {delivery.status}
                        {delivery.viewCount > 0 && ` · просмотрен ${delivery.viewCount} раз`}
                    </span>
                    <small>
                        {delivery.recipientEmail} · {new Date(delivery.createdAt).toLocaleString('ru-RU')}
                        {delivery.errorMessage && ` · ${delivery.errorMessage}`}
                    </small>
                </div>
            ))}
        </details>
    );
};

const HistorySection = ({ invoice }: { invoice: Invoice }) => {
    const { t } = useTranslation();
    return (
        <details className={s.history}>
            <summary>{t('История ({{count}})', { count: invoice.auditLogs.length })}</summary>
            {invoice.auditLogs.map((log) => (
                <div key={log.id}>
                    <span>{actionLabel[log.action] ?? log.action}</span>
                    <small>{actorName(log)} · {new Date(log.createdAt).toLocaleString('ru-RU')}</small>
                </div>
            ))}
        </details>
    );
};

export const InvoiceListItem = memo((props: InvoiceListItemProps) => {
    const {
        invoice, onEdit, onPreviewPdf, onDownloadPdf,
        onSendEmail, onCreateMolliePaymentLink, onSetActiveAction, onUpdateStatus,
    } = props;
    const { t } = useTranslation();
    const editable = canEdit(invoice);

    return (
        <article className={s.card}>
            <div className={s.main}>
                <div className={s.number}>
                    {invoice.number}
                    <small>{documentLabel[invoice.documentType]}</small>
                </div>
                <div className={s.client}>{invoice.billToName}</div>
                <div className={s.meta}>
                    {new Date(invoice.issueDate).toLocaleDateString('ru-RU')} · {t('{{count}} строк', { count: invoice.items.length })}
                </div>
            </div>

            <span className={`${s.status} ${s[invoice.status.toLowerCase()]}`}>
                {statusLabel[invoice.status]}
            </span>

            <Amounts invoice={invoice} />

            <ActionButtons
                invoice={invoice} editable={editable} onEdit={onEdit} onPreviewPdf={onPreviewPdf}
                onDownloadPdf={onDownloadPdf} onSendEmail={onSendEmail}
                onCreateMolliePaymentLink={onCreateMolliePaymentLink}
                onSetActiveAction={onSetActiveAction} onUpdateStatus={onUpdateStatus}
            />

            {invoice.molliePayments.length > 0 && <MolliePaymentsSection invoice={invoice} />}
            {invoice.molliePaymentLinks.length > 0 && <MolliePaymentLinksSection invoice={invoice} />}
            {invoice.payments.length > 0 && <PaymentsSection invoice={invoice} />}
            {invoice.deliveries.length > 0 && <DeliveriesSection invoice={invoice} />}
            <HistorySection invoice={invoice} />
        </article>
    );
});
