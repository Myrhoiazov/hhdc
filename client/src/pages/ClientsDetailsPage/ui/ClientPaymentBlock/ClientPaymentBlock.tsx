import { memo } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import s from './ClientPaymentBlock.module.scss';
import { useClientPaymentBlock } from './useClientPaymentBlock';
import { ClientPaymentHeader } from './ClientPaymentHeader';
import { ClientPaymentMetrics } from './ClientPaymentMetrics';
import { ClientPayersSection } from './ClientPayersSection';
import { ClientSubscriptionsSection } from './ClientSubscriptionsSection';
import { ClientMandatesSection } from './ClientMandatesSection';
import { ClientPaymentLinksSection } from './ClientPaymentLinksSection';
import { ClientLatestPaymentsSection } from './ClientLatestPaymentsSection';
import { ClientPaymentBlockModals } from './ClientPaymentBlockModals';

interface ClientPaymentBlockProps {
    id: string;
}

interface ContentProps {
    data: ReturnType<typeof useClientPaymentBlock>['data'];
    statusText: ReturnType<typeof useClientPaymentBlock>['statusText'];
    onOpenPaymentLink: () => void;
    onOpenMandate: () => void;
    onOpenSubscription: () => void;
    onOpenEdit: (subscription: NonNullable<ReturnType<typeof useClientPaymentBlock>['data']>['subscriptions'][number]) => void;
    onCancel: (subscription: NonNullable<ReturnType<typeof useClientPaymentBlock>['data']>['subscriptions'][number]) => void;
    onOpenRestart: (subscription: NonNullable<ReturnType<typeof useClientPaymentBlock>['data']>['subscriptions'][number]) => void;
    onRevoke: (mandate: NonNullable<ReturnType<typeof useClientPaymentBlock>['data']>['mandates'][number]) => void;
    onCopy: (checkoutUrl?: string) => void;
    onCancelLink: (payment: NonNullable<ReturnType<typeof useClientPaymentBlock>['data']>['paymentLinks'][number]) => void;
}

const Content = (props: ContentProps) => {
    const {
        data, statusText, onOpenPaymentLink, onOpenMandate, onOpenSubscription,
        onOpenEdit, onCancel, onOpenRestart, onRevoke, onCopy, onCancelLink,
    } = props;

    return (
        <VStack gap="16" max>
            <ClientPaymentHeader
                statusText={statusText} paymentStatus={data?.summary.paymentStatus ?? 'unknown'}
                onOpenPaymentLink={onOpenPaymentLink} onOpenMandate={onOpenMandate} onOpenSubscription={onOpenSubscription}
            />
            <ClientPaymentMetrics
                payerCount={data?.summary.payerCount} activeSubscriptionCount={data?.summary.activeSubscriptionCount}
                lastPayment={data?.summary.lastPayment}
            />
            <ClientPayersSection payers={data?.payers} />
            <ClientSubscriptionsSection
                subscriptions={data?.subscriptions} onOpenEdit={onOpenEdit} onCancel={onCancel} onOpenRestart={onOpenRestart}
            />
            <ClientMandatesSection mandates={data?.mandates} onRevoke={onRevoke} />
            <ClientPaymentLinksSection paymentLinks={data?.paymentLinks} onCopy={onCopy} onCancel={onCancelLink} />
            <ClientLatestPaymentsSection latestPayments={data?.latestPayments} />
        </VStack>
    );
};

const LoadingCard = () => (
    <Card id="mollie-account" padding="24" fullWidth className={s.card}>
        <VStack gap="16" max>
            <Skeleton width={260} height={28} />
            <Skeleton width="100%" height={72} border="12px" />
            <Skeleton width="100%" height={72} border="12px" />
        </VStack>
    </Card>
);

const ErrorCard = () => (
    <Card id="mollie-account" padding="24" fullWidth className={s.card}>
        <Text title="Платежи ученика" text="Не удалось загрузить платежный блок." size="m" />
    </Card>
);

type PaymentBlockState = ReturnType<typeof useClientPaymentBlock>;

const ClientPaymentBlockBody = ({ id, state }: { id: string; state: PaymentBlockState }) => {
    const {
        data, statusText, isSaving,
        isPaymentLinkOpen, setIsPaymentLinkOpen, isMandateOpen, setIsMandateOpen,
        isSubscriptionOpen, setIsSubscriptionOpen, editingSubscription, setEditingSubscription,
        restartingSubscription, setRestartingSubscription,
        mandateForm, setMandateForm, subscriptionForm, setSubscriptionForm,
        editSubscriptionForm, setEditSubscriptionForm, restartForm, setRestartForm,
        payers, payerOptions, mandateOptions, getMandateOptionsForCustomer, onPaymentLinkCreated,
        onCopyPaymentLink, onCancelPaymentLink, onCreateMandate, onCreateSubscription, onCancelSubscription,
        onOpenEditSubscription, onUpdateSubscription, onOpenRestartSubscription, onRestartSubscription,
        onRevokeMandate,
    } = state;

    return (
        <Card id="mollie-account" padding="24" fullWidth className={s.card}>
            <Content
                data={data} statusText={statusText}
                onOpenPaymentLink={() => setIsPaymentLinkOpen(true)} onOpenMandate={() => setIsMandateOpen(true)}
                onOpenSubscription={() => setIsSubscriptionOpen(true)}
                onOpenEdit={onOpenEditSubscription} onCancel={onCancelSubscription}
                onOpenRestart={onOpenRestartSubscription} onRevoke={onRevokeMandate}
                onCopy={onCopyPaymentLink} onCancelLink={onCancelPaymentLink}
            />

            <ClientPaymentBlockModals
                id={id} payers={payers} isSaving={isSaving}
                isPaymentLinkOpen={isPaymentLinkOpen} isMandateOpen={isMandateOpen} isSubscriptionOpen={isSubscriptionOpen}
                mandateForm={mandateForm} subscriptionForm={subscriptionForm} editSubscriptionForm={editSubscriptionForm}
                editingSubscription={editingSubscription} restartForm={restartForm} restartingSubscription={restartingSubscription}
                payerOptions={payerOptions} mandateOptions={mandateOptions}
                getMandateOptionsForCustomer={getMandateOptionsForCustomer}
                onClosePaymentLink={() => setIsPaymentLinkOpen(false)} onCloseMandate={() => setIsMandateOpen(false)}
                onCloseSubscription={() => setIsSubscriptionOpen(false)} onCloseEdit={() => setEditingSubscription(null)}
                onCloseRestart={() => setRestartingSubscription(null)} onPaymentLinkCreated={onPaymentLinkCreated}
                setMandateForm={setMandateForm} setSubscriptionForm={setSubscriptionForm}
                setEditSubscriptionForm={setEditSubscriptionForm} setRestartForm={setRestartForm}
                onCreateMandate={onCreateMandate} onCreateSubscription={onCreateSubscription}
                onUpdateSubscription={onUpdateSubscription} onRestartSubscription={onRestartSubscription}
            />
        </Card>
    );
};

export const ClientPaymentBlock = memo(({ id }: ClientPaymentBlockProps) => {
    const state = useClientPaymentBlock({ id });

    if (state.isLoading) return <LoadingCard />;
    if (state.error) return <ErrorCard />;
    return <ClientPaymentBlockBody id={id} state={state} />;
});
