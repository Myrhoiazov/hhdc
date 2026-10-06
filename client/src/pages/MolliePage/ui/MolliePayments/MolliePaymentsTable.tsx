import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MolliePayment, MolliePaymentCustomer, issueStatuses } from './useMolliePayments';
import s from './MolliePayments.module.scss';

const formatAmount = (payment: MolliePayment) => {
    const amount = Number(payment.amountValue ?? 0);

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: payment.amountCurrency || 'EUR',
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getCustomerName = (customer?: MolliePaymentCustomer) => {
    if (!customer) {
        return 'Клиент не привязан';
    }

    return customer.payerName
        || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
        || customer.email
        || customer.mollieId
        || 'Без имени';
};

const getStudentLinks = (customer?: MolliePaymentCustomer) => (
    customer?.clientLinks?.length
        ? customer.clientLinks
        : customer?.client?.id
            ? [{ id: customer.client.id, client: customer.client }]
            : []
);

interface MolliePaymentsTableProps {
    payments: MolliePayment[];
}

export const MolliePaymentsTable = memo(({ payments }: MolliePaymentsTableProps) => {
    const { t } = useTranslation('home');

    return (
        <div className={s.table}>
            <div className={s.tableHeader}>
                <span>{t('Платёж')}</span>
                <span>{t('Плательщик / ученик')}</span>
                <span>{t('Сумма')}</span>
                <span>{t('Статус')}</span>
                <span>{t('Дата')}</span>
                <span>{t('Подписка')}</span>
            </div>
            {payments.map((payment) => (
                <div className={s.tableRow} key={payment.id}>
                    <div className={s.paymentCell}>
                        <span className={s.primaryText}>{payment.description || payment.mollieId || `#${payment.id}`}</span>
                        <span className={s.mutedText}>{payment.method || 'unknown'} · {payment.mollieId || 'no Mollie ID'}</span>
                    </div>
                    <div className={s.paymentCell}>
                        {payment.customer?.id ? (
                            <Link className={s.link} to={`/mollie/customers/${payment.customer.id}`}>
                                {getCustomerName(payment.customer)}
                            </Link>
                        ) : (
                            <span className={s.primaryText}>{getCustomerName(payment.customer)}</span>
                        )}
                        <span className={s.mutedText}>{payment.customer?.email || payment.customer?.mollieId || '—'}</span>
                        {getStudentLinks(payment.customer).map((link) => (
                            link.client?.id ? (
                                <Link className={s.link} to={`/clients/${link.client.id}`} key={link.id}>
                                    {t('Ученик: {{name}}', { name: [link.client.firstName, link.client.lastName].filter(Boolean).join(' ') || link.client.email || `#${link.client.id}` })}
                                </Link>
                            ) : null
                        ))}
                    </div>
                    <span className={s.amount}>{formatAmount(payment)}</span>
                    <span className={s.statusWrapper}>
                        <span className={`${s.status} ${issueStatuses.includes(payment.status) ? s.issue : s[payment.status] || ''}`}>
                            {payment.status}
                        </span>
                    </span>
                    <span className={s.primaryText}>{formatDate(payment.paidAt || payment.createdAt)}</span>
                    <span className={s.mutedText}>{payment.subscription?.mollieId || '—'}</span>
                </div>
            ))}
        </div>
    );
});
