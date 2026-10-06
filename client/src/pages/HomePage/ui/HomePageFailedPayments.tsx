import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { FailedPayment, FailedPaymentCustomer, MollieDashboardSummary } from '../useHomePageData';
import cls from './HomePage.module.scss';

const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(value);

const getCustomerName = (customer?: FailedPaymentCustomer | null) => {
    if (!customer) {
        return 'Клиент не привязан';
    }

    const fullName = [customer.givenName, customer.familyName].filter(Boolean).join(' ');

    return fullName || customer.email || `Customer #${customer.id}`;
};

interface HomePageFailedPaymentsProps {
    summary?: MollieDashboardSummary;
}

const FailedPaymentsHeader = ({ failedCount }: { failedCount?: number }) => {
    const { t } = useTranslation('home');
    return (
        <HStack justify="between" align="center" max>
            <Text title="Последние проблемные списания" size="m" bold />
            <HStack gap="16" align="center">
                <Text text={`${failedCount ?? 0} total`} />
                <Link className={cls.incidentsLink} to="/mollie/incidents">
                    {t('Открыть все проблемы')}
                </Link>
            </HStack>
        </HStack>
    );
};

const FailedPaymentRow = ({ payment, defaultCurrency }: {
    payment: FailedPayment;
    defaultCurrency: string;
}) => (
    <HStack
        className={cls.failedPayment}
        justify="between"
        gap="16"
        max
    >
        <VStack gap="4">
            <Text
                text={`${getCustomerName(payment.customer)} · ${payment.status}`}
                bold
            />
            <Text
                text={
                    [
                        payment.description,
                        !payment.customer && payment.mollieId,
                    ]
                        .filter(Boolean)
                        .join(' · ') || '-'
                }
                size="s"
            />
        </VStack>
        <Text
            text={formatMoney(
                payment.amountValue,
                payment.amountCurrency || defaultCurrency,
            )}
            bold
        />
    </HStack>
);

export const HomePageFailedPayments = memo(({ summary }: HomePageFailedPaymentsProps) => (
    <Card padding="24" max shadow="shadowLight" className={cls.sectionCard}>
        <VStack gap="16" max>
            <FailedPaymentsHeader failedCount={summary?.failedPayments} />
            {!summary?.latestFailedPayments?.length ? (
                <Text text="Проблемных автосписаний нет — касса танцует ровно." />
            ) : (
                <VStack gap="8" max>
                    {summary.latestFailedPayments.map((payment) => (
                        <FailedPaymentRow
                            key={payment.id}
                            payment={payment}
                            defaultCurrency={summary.currency}
                        />
                    ))}
                </VStack>
            )}
        </VStack>
    </Card>
));
