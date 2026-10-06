import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card/Card';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { formatCurrency, UpcomingSubscription } from './useMolliePaymentsMatrix';
import s from './MolliePaymentsMatrix.module.scss';

const getUpcomingStudent = (subscription: UpcomingSubscription) => (
    subscription.customer.client
    || subscription.customer.clientLinks?.map((link) => link.client).find(Boolean)
);
const getPayerName = (subscription: UpcomingSubscription) => (
    subscription.customer.payerName
    || [subscription.customer.givenName, subscription.customer.familyName].filter(Boolean).join(' ')
    || subscription.customer.email
    || `Плательщик #${subscription.customer.id}`
);

interface MolliePaymentsMatrixUpcomingProps {
    upcomingMonth: string;
    onUpcomingMonthChange: (value: string) => void;
    upcomingMonthOptions: SelectOption<string>[];
    total: number;
    amount: number;
    currency?: string;
    isLoading: boolean;
    items: UpcomingSubscription[];
}

const UpcomingRow = ({ subscription }: { subscription: UpcomingSubscription }) => {
    const { t } = useTranslation();
    const student = getUpcomingStudent(subscription);

    return (
        <div className={s.upcomingRow} key={subscription.id}>
            <div className={s.upcomingIdentity}>
                {student?.id ? (
                    <Link className={s.personLink} to={`/clients/${student.id}`}>
                        {[student.firstName, student.lastName].filter(Boolean).join(' ') || `Ученик #${student.id}`}
                    </Link>
                ) : (
                    <Link className={s.personLink} to={`/mollie/customers/${subscription.customer.id}`}>
                        {getPayerName(subscription)}
                    </Link>
                )}
                <Link className={s.personMetaLink} to={`/mollie/customers/${subscription.customer.id}`}>
                    {t('Плательщик: {{name}}', { name: getPayerName(subscription) })}
                </Link>
            </div>
            <span>{new Date(subscription.nextPaymentDate).toLocaleDateString('nl-NL')}</span>
            <span className={s.upcomingAmount}>{formatCurrency(subscription.amountValue, subscription.amountCurrency)}</span>
            <span className={s.personMeta}>{subscription.description}</span>
            <span className={`${s.mandateStatus} ${subscription.mandate?.status === 'valid' ? s.valid : s.invalid}`}>
                {subscription.mandate?.status || 'no mandate'}
            </span>
        </div>
    );
};

export const MolliePaymentsMatrixUpcoming = memo((props: MolliePaymentsMatrixUpcomingProps) => {
    const {
        upcomingMonth, onUpcomingMonthChange, upcomingMonthOptions,
        total, amount, currency, isLoading, items,
    } = props;
    const { t } = useTranslation();

    return (
        <Card padding="16" fullWidth className={s.upcomingCard}>
            <VStack gap="16" max>
                <HStack max justify="between" align="center" gap="16" className={s.upcomingHeader}>
                    <div>
                        <Text title="Предстоящие списания" size="m" bold />
                        <Text text="Ближайшие даты активных Mollie subscriptions." size="s" className={s.subtitle} />
                    </div>
                    <Select
                        label="Месяц списания"
                        value={upcomingMonth}
                        options={upcomingMonthOptions}
                        onChange={onUpcomingMonthChange}
                    />
                </HStack>

                <div className={s.upcomingSummary}>
                    <span><b>{total}</b>{t(' списаний')}</span>
                    <span><b>{formatCurrency(amount, currency)}</b>{t(' ожидается')}</span>
                </div>

                {isLoading ? (
                    <Skeleton width="100%" height={76} border="12px" />
                ) : items.length ? (
                    <div className={s.upcomingList}>
                        {items.map((subscription) => (
                            <UpcomingRow subscription={subscription} key={subscription.id} />
                        ))}
                    </div>
                ) : (
                    <div className={s.empty}>{t('В выбранном месяце предстоящих списаний нет.')}</div>
                )}
            </VStack>
        </Card>
    );
});
