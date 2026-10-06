import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import type { SelectOption } from '@/shared/ui/Select/Select';
import { PaymentLinkPayer } from '../PaymentLinkModal/PaymentLinkModal';
import { getPayerName, today } from './helpers';
import { useMandateActions } from './useMandateActions';
import { usePaymentLinkActions } from './usePaymentLinkActions';
import { useSubscriptionCreateActions } from './useSubscriptionCreateActions';
import { useSubscriptionEditActions } from './useSubscriptionEditActions';
import { useSubscriptionRestartActions } from './useSubscriptionRestartActions';
import type {
    ClientMandate,
    ClientPayment,
    ClientPaymentSummary,
    ClientSubscription,
    PaymentCustomer,
} from './types';

export interface MandateForm {
    customerId: string;
    consumerName: string;
    consumerAccount: string;
    consumerBic: string;
    signatureDate: string;
}

export interface SubscriptionForm {
    customerId: string;
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
}

export interface EditSubscriptionForm {
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
    times: string;
}

export interface RestartForm {
    mandateId: string;
    startDate: string;
}

export interface UseClientPaymentBlockResult {
    id: string;
    data: ClientPaymentSummary | null;
    isLoading: boolean;
    error: boolean;
    isPaymentLinkOpen: boolean;
    setIsPaymentLinkOpen: (open: boolean) => void;
    isMandateOpen: boolean;
    setIsMandateOpen: (open: boolean) => void;
    isSubscriptionOpen: boolean;
    setIsSubscriptionOpen: (open: boolean) => void;
    editingSubscription: ClientSubscription | null;
    setEditingSubscription: (subscription: ClientSubscription | null) => void;
    restartingSubscription: ClientSubscription | null;
    setRestartingSubscription: (subscription: ClientSubscription | null) => void;
    isSaving: boolean;
    mandateForm: MandateForm;
    setMandateForm: Dispatch<SetStateAction<MandateForm>>;
    subscriptionForm: SubscriptionForm;
    setSubscriptionForm: Dispatch<SetStateAction<SubscriptionForm>>;
    editSubscriptionForm: EditSubscriptionForm;
    setEditSubscriptionForm: Dispatch<SetStateAction<EditSubscriptionForm>>;
    restartForm: RestartForm;
    setRestartForm: Dispatch<SetStateAction<RestartForm>>;
    payers: PaymentLinkPayer[];
    payerOptions: SelectOption<string>[];
    mandateOptions: SelectOption<string>[];
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    reload: () => void;
    onPaymentLinkCreated: () => void;
    onCopyPaymentLink: (checkoutUrl?: string) => Promise<void>;
    onCancelPaymentLink: (payment: ClientPayment) => Promise<void>;
    onCreateMandate: (form: MandateForm) => Promise<void>;
    onCreateSubscription: (form: SubscriptionForm) => Promise<void>;
    onCancelSubscription: (subscription: ClientSubscription) => Promise<void>;
    onOpenEditSubscription: (subscription: ClientSubscription) => void;
    onUpdateSubscription: (subscription: ClientSubscription, form: EditSubscriptionForm) => Promise<void>;
    onOpenRestartSubscription: (subscription: ClientSubscription) => void;
    onRestartSubscription: (subscription: ClientSubscription, form: RestartForm) => Promise<void>;
    onRevokeMandate: (mandate: ClientMandate) => Promise<void>;
    statusText: string;
}

const usePaymentFormState = () => {
    const [isPaymentLinkOpen, setIsPaymentLinkOpen] = useState(false);
    const [isMandateOpen, setIsMandateOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<ClientSubscription | null>(null);
    const [restartingSubscription, setRestartingSubscription] = useState<ClientSubscription | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [mandateForm, setMandateForm] = useState<MandateForm>({
        customerId: '', consumerName: '', consumerAccount: '', consumerBic: '', signatureDate: today,
    });
    const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>({
        customerId: '', mandateId: '', amountValue: '', interval: '1 month', startDate: today, description: '',
    });
    const [editSubscriptionForm, setEditSubscriptionForm] = useState<EditSubscriptionForm>({
        mandateId: '', amountValue: '', interval: '', startDate: '', description: '', times: '',
    });
    const [restartForm, setRestartForm] = useState<RestartForm>({
        mandateId: '', startDate: today,
    });

    return {
        isPaymentLinkOpen, setIsPaymentLinkOpen,
        isMandateOpen, setIsMandateOpen,
        isSubscriptionOpen, setIsSubscriptionOpen,
        editingSubscription, setEditingSubscription,
        restartingSubscription, setRestartingSubscription,
        isSaving, setIsSaving,
        mandateForm, setMandateForm,
        subscriptionForm, setSubscriptionForm,
        editSubscriptionForm, setEditSubscriptionForm,
        restartForm, setRestartForm,
    };
};

const usePaymentData = (id: string) => {
    const [data, setData] = useState<ClientPaymentSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        setIsLoading(true);
        setError(false);

        $apiPrivate.get<ClientPaymentSummary>(`/clients/${id}/payment-summary`)
            .then((response) => {
                setData(response.data);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [id, reloadKey]);

    const reload = useCallback(() => setReloadKey((prev) => prev + 1), []);

    return { data, isLoading, error, reload };
};

const usePaymentDerivedState = (data: ClientPaymentSummary | null, subscriptionForm: SubscriptionForm) => {
    const payers = useMemo<PaymentLinkPayer[]>(() => data?.payers
        .filter((payer) => payer.customer?.id)
        .map((payer) => ({
            id: payer.customer!.id,
            name: getPayerName(payer.customer),
            email: payer.customer?.email,
        })) ?? [], [data?.payers]);

    const payerOptions = useMemo<SelectOption<string>[]>(() => payers
        .filter((payer) => data?.payers.find((link) => link.customer?.id === payer.id)?.customer?.mollieId)
        .map((payer) => ({
            value: String(payer.id),
            content: payer.email ? `${payer.name} · ${payer.email}` : payer.name,
        })), [data?.payers, payers]);

    const selectedSubscriptionPayer = data?.payers.find(
        (payer) => String(payer.customer?.id) === subscriptionForm.customerId,
    )?.customer;

    const mandateOptions = (data?.mandates
        .filter((mandate) => mandate.status === 'valid'
            && mandate.customer?.mollieId === selectedSubscriptionPayer?.mollieId)
        ?? [])
        .map((mandate) => ({
            value: mandate.mollieId ?? '',
            content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
        }))
        .filter((option) => option.value);

    const getMandateOptionsForCustomer = useCallback((customer?: PaymentCustomer | null) => (
        data?.mandates
            .filter((mandate) => mandate.status === 'valid' && mandate.customer?.id === customer?.id)
            .map((mandate) => ({
                value: mandate.mollieId ?? '',
                content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
            }))
            .filter((option) => option.value) ?? []
    ), [data?.mandates]);

    const statusText = useMemo(() => {
        if (data?.summary.paymentStatus === 'issue') return 'Есть проблема';
        if (data?.summary.paymentStatus === 'active') return 'Активно';
        return 'Не настроено';
    }, [data?.summary.paymentStatus]);

    return { payers, payerOptions, mandateOptions, getMandateOptionsForCustomer, statusText };
};

export const useClientPaymentBlock = ({ id }: { id: string }): UseClientPaymentBlockResult => {
    const { data, isLoading, error, reload } = usePaymentData(id);
    const formState = usePaymentFormState();
    const {
        setIsSaving, setIsMandateOpen, setIsSubscriptionOpen,
        setEditingSubscription, setEditSubscriptionForm,
        setRestartingSubscription, setRestartForm, subscriptionForm,
    } = formState;
    const { payers, payerOptions, mandateOptions, getMandateOptionsForCustomer, statusText } =
        usePaymentDerivedState(data, subscriptionForm);

    const { onCopyPaymentLink, onCancelPaymentLink } = usePaymentLinkActions(id, reload);
    const { onCreateMandate, onRevokeMandate } = useMandateActions(data, reload, setIsSaving, setIsMandateOpen);
    const { onCreateSubscription, onCancelSubscription } =
        useSubscriptionCreateActions(data, reload, setIsSaving, setIsSubscriptionOpen);
    const { onOpenEditSubscription, onUpdateSubscription } = useSubscriptionEditActions(
        reload, setIsSaving, getMandateOptionsForCustomer, setEditingSubscription, setEditSubscriptionForm,
    );
    const { onOpenRestartSubscription, onRestartSubscription } = useSubscriptionRestartActions(
        reload, setIsSaving, getMandateOptionsForCustomer, setRestartingSubscription, setRestartForm,
    );

    return {
        id,
        data, isLoading, error,
        ...formState,
        payers, payerOptions, mandateOptions,
        getMandateOptionsForCustomer,
        reload,
        onPaymentLinkCreated: reload,
        onCopyPaymentLink, onCancelPaymentLink,
        onCreateMandate, onCreateSubscription, onCancelSubscription,
        onOpenEditSubscription, onUpdateSubscription,
        onOpenRestartSubscription, onRestartSubscription,
        onRevokeMandate,
        statusText,
    };
};
