import { memo, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Input } from '@/shared/ui/Input/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { PaymentLinkModal, PaymentLinkPayer } from '../PaymentLinkModal/PaymentLinkModal';
import { today } from './helpers';
import type { ClientSubscription, PaymentCustomer } from './types';
import type {
    EditSubscriptionForm,
    MandateForm,
    RestartForm,
    SubscriptionForm,
} from './useClientPaymentBlock';
import s from './ClientPaymentBlock.module.scss';

interface ClientPaymentBlockModalsProps {
    id: string;
    payers: PaymentLinkPayer[];
    isSaving: boolean;
    isPaymentLinkOpen: boolean;
    isMandateOpen: boolean;
    isSubscriptionOpen: boolean;
    mandateForm: MandateForm;
    subscriptionForm: SubscriptionForm;
    editSubscriptionForm: EditSubscriptionForm;
    editingSubscription: ClientSubscription | null;
    restartForm: RestartForm;
    restartingSubscription: ClientSubscription | null;
    payerOptions: SelectOption<string>[];
    mandateOptions: SelectOption<string>[];
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    onClosePaymentLink: () => void;
    onCloseMandate: () => void;
    onCloseSubscription: () => void;
    onCloseEdit: () => void;
    onCloseRestart: () => void;
    onPaymentLinkCreated: () => void;
    setMandateForm: Dispatch<SetStateAction<MandateForm>>;
    setSubscriptionForm: Dispatch<SetStateAction<SubscriptionForm>>;
    setEditSubscriptionForm: Dispatch<SetStateAction<EditSubscriptionForm>>;
    setRestartForm: Dispatch<SetStateAction<RestartForm>>;
    onCreateMandate: (form: MandateForm) => void;
    onCreateSubscription: (form: SubscriptionForm) => void;
    onUpdateSubscription: (subscription: ClientSubscription, form: EditSubscriptionForm) => void;
    onRestartSubscription: (subscription: ClientSubscription, form: RestartForm) => void;
}

const ManageActions = ({
    isSaving,
    onClose,
    onSubmit,
    submitLabel,
    savingLabel,
}: {
    isSaving: boolean;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel: string;
    savingLabel: string;
}) => {
    const { t } = useTranslation();
    return (
        <HStack gap="8" max justify="end">
            <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isSaving}>{t('Закрыть')}</Button>
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSubmit} disabled={isSaving}>{isSaving ? savingLabel : submitLabel}</Button>
        </HStack>
    );
};

const MandateModal = (props: {
    isOpen: boolean;
    isSaving: boolean;
    mandateForm: MandateForm;
    payerOptions: SelectOption<string>[];
    setMandateForm: Dispatch<SetStateAction<MandateForm>>;
    onClose: () => void;
    onCreate: (form: MandateForm) => void;
}) => {
    const {
        isOpen,
        isSaving,
        mandateForm,
        payerOptions,
        setMandateForm,
        onClose,
        onCreate,
    } = props;

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack gap="16" max className={s.actionModal}>
                <Text title="Создать mandate" text="Mandate разрешает регулярные списания с IBAN плательщика." size="m" bold />
                <Select
                    label="Плательщик"
                    defaultValue="Выберите плательщика"
                    options={payerOptions}
                    value={mandateForm.customerId}
                    onChange={(customerId) => setMandateForm((prev) => ({ ...prev, customerId }))}
                />
                <Input fullWidth label="Имя владельца счёта" value={mandateForm.consumerName} onChange={(consumerName) => setMandateForm((prev) => ({ ...prev, consumerName }))} />
                <Input fullWidth label="IBAN" value={mandateForm.consumerAccount} onChange={(consumerAccount) => setMandateForm((prev) => ({ ...prev, consumerAccount }))} />
                <Input fullWidth label="BIC, необязательно" value={mandateForm.consumerBic} onChange={(consumerBic) => setMandateForm((prev) => ({ ...prev, consumerBic }))} />
                <Input fullWidth label="Дата подписи" type="date" value={mandateForm.signatureDate} onChange={(signatureDate) => setMandateForm((prev) => ({ ...prev, signatureDate }))} />
                <ManageActions
                    isSaving={isSaving}
                    onClose={onClose}
                    onSubmit={() => onCreate(mandateForm)}
                    submitLabel="Создать mandate"
                    savingLabel="Создание..."
                />
            </VStack>
        </Modal>
    );
};

const SubscriptionModal = (props: {
    isOpen: boolean;
    isSaving: boolean;
    subscriptionForm: SubscriptionForm;
    payerOptions: SelectOption<string>[];
    mandateOptions: SelectOption<string>[];
    setSubscriptionForm: Dispatch<SetStateAction<SubscriptionForm>>;
    onClose: () => void;
    onCreate: (form: SubscriptionForm) => void;
}) => {
    const { isOpen, isSaving, subscriptionForm, payerOptions, mandateOptions, setSubscriptionForm, onClose, onCreate } = props;

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack gap="16" max className={s.actionModal}>
                <Text title="Создать подписку" text="Для подписки требуется valid mandate выбранного плательщика." size="m" bold />
                <Select
                    label="Плательщик" defaultValue="Выберите плательщика" options={payerOptions}
                    value={subscriptionForm.customerId}
                    onChange={(customerId) => setSubscriptionForm((prev) => ({ ...prev, customerId, mandateId: '' }))}
                />
                <Select
                    label="Valid mandate" options={mandateOptions} value={subscriptionForm.mandateId}
                    defaultValue={subscriptionForm.customerId ? 'Выберите mandate' : 'Сначала выберите плательщика'}
                    onChange={(mandateId) => setSubscriptionForm((prev) => ({ ...prev, mandateId }))}
                />
                <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={subscriptionForm.amountValue} onChange={(amountValue) => setSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                <Input fullWidth label="Интервал" placeholder="1 month" value={subscriptionForm.interval} onChange={(interval) => setSubscriptionForm((prev) => ({ ...prev, interval }))} />
                <Input fullWidth label="Дата начала" type="date" value={subscriptionForm.startDate} onChange={(startDate) => setSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                <Input fullWidth label="Описание" value={subscriptionForm.description} onChange={(description) => setSubscriptionForm((prev) => ({ ...prev, description }))} />
                <ManageActions
                    isSaving={isSaving} onClose={onClose} onSubmit={() => onCreate(subscriptionForm)}
                    submitLabel="Создать подписку" savingLabel="Создание..."
                />
            </VStack>
        </Modal>
    );
};

const EditSubscriptionModal = (props: {
    isOpen: boolean;
    isSaving: boolean;
    editingSubscription: ClientSubscription | null;
    editSubscriptionForm: EditSubscriptionForm;
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    setEditSubscriptionForm: Dispatch<SetStateAction<EditSubscriptionForm>>;
    onClose: () => void;
    onUpdate: (subscription: ClientSubscription, form: EditSubscriptionForm) => void;
}) => {
    const {
        isOpen,
        isSaving,
        editingSubscription,
        editSubscriptionForm,
        getMandateOptionsForCustomer,
        setEditSubscriptionForm,
        onClose,
        onUpdate,
    } = props;

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack gap="16" max className={s.actionModal}>
                <Text title="Изменить активную подписку" text="При изменении даты CRM остановит текущую подписку и создаст новую. История сохранится." size="m" bold />
                <Select label="Valid mandate" options={getMandateOptionsForCustomer(editingSubscription?.customer)} value={editSubscriptionForm.mandateId} onChange={(mandateId) => setEditSubscriptionForm((prev) => ({ ...prev, mandateId }))} />
                <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={editSubscriptionForm.amountValue} onChange={(amountValue) => setEditSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                <Input fullWidth label="Интервал" placeholder="1 month" value={editSubscriptionForm.interval} onChange={(interval) => setEditSubscriptionForm((prev) => ({ ...prev, interval }))} />
                <Input fullWidth label="Дата следующего списания" type="date" min={today} value={editSubscriptionForm.startDate} onChange={(startDate) => setEditSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                <Input fullWidth label="Количество списаний, необязательно" type="number" min="1" value={editSubscriptionForm.times} onChange={(times) => setEditSubscriptionForm((prev) => ({ ...prev, times }))} />
                <Input fullWidth label="Описание" value={editSubscriptionForm.description} onChange={(description) => setEditSubscriptionForm((prev) => ({ ...prev, description }))} />
                <ManageActions
                    isSaving={isSaving}
                    onClose={onClose}
                    onSubmit={() => editingSubscription && onUpdate(editingSubscription, editSubscriptionForm)}
                    submitLabel="Сохранить"
                    savingLabel="Сохранение..."
                />
            </VStack>
        </Modal>
    );
};

const RestartSubscriptionModal = (props: {
    isOpen: boolean;
    isSaving: boolean;
    restartingSubscription: ClientSubscription | null;
    restartForm: RestartForm;
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    setRestartForm: Dispatch<SetStateAction<RestartForm>>;
    onClose: () => void;
    onRestart: (subscription: ClientSubscription, form: RestartForm) => void;
}) => {
    const {
        isOpen,
        isSaving,
        restartingSubscription,
        restartForm,
        getMandateOptionsForCustomer,
        setRestartForm,
        onClose,
        onRestart,
    } = props;

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack gap="16" max className={s.actionModal}>
                <Text title="Запустить подписку снова" text="Mollie создаст новую подписку с параметрами старой. Старая останется в истории." size="m" bold />
                <Select label="Valid mandate" options={getMandateOptionsForCustomer(restartingSubscription?.customer)} value={restartForm.mandateId} onChange={(mandateId) => setRestartForm((prev) => ({ ...prev, mandateId }))} />
                <Input fullWidth label="Дата первого списания" type="date" min={today} value={restartForm.startDate} onChange={(startDate) => setRestartForm((prev) => ({ ...prev, startDate }))} />
                <ManageActions
                    isSaving={isSaving}
                    onClose={onClose}
                    onSubmit={() => restartingSubscription && onRestart(restartingSubscription, restartForm)}
                    submitLabel="Запустить снова"
                    savingLabel="Запуск..."
                />
            </VStack>
        </Modal>
    );
};

export const ClientPaymentBlockModals = memo((props: ClientPaymentBlockModalsProps) => {
    const {
        id, payers, isSaving,
        isPaymentLinkOpen, isMandateOpen, isSubscriptionOpen,
        mandateForm, subscriptionForm, editSubscriptionForm, editingSubscription,
        restartForm, restartingSubscription, payerOptions, mandateOptions, getMandateOptionsForCustomer,
        onClosePaymentLink, onCloseMandate, onCloseSubscription, onCloseEdit, onCloseRestart, onPaymentLinkCreated,
        setMandateForm, setSubscriptionForm, setEditSubscriptionForm, setRestartForm,
        onCreateMandate, onCreateSubscription, onUpdateSubscription, onRestartSubscription,
    } = props;

    return (
        <>
            <PaymentLinkModal
                clientId={id} payers={payers} isOpen={isPaymentLinkOpen}
                onClose={onClosePaymentLink} onCreated={onPaymentLinkCreated}
            />

            <MandateModal
                isOpen={isMandateOpen} isSaving={isSaving} mandateForm={mandateForm} payerOptions={payerOptions}
                setMandateForm={setMandateForm} onClose={onCloseMandate} onCreate={onCreateMandate}
            />

            <SubscriptionModal
                isOpen={isSubscriptionOpen} isSaving={isSaving} subscriptionForm={subscriptionForm}
                payerOptions={payerOptions} mandateOptions={mandateOptions} setSubscriptionForm={setSubscriptionForm}
                onClose={onCloseSubscription} onCreate={onCreateSubscription}
            />

            <EditSubscriptionModal
                isOpen={Boolean(editingSubscription)} isSaving={isSaving} editingSubscription={editingSubscription}
                editSubscriptionForm={editSubscriptionForm} getMandateOptionsForCustomer={getMandateOptionsForCustomer}
                setEditSubscriptionForm={setEditSubscriptionForm} onClose={onCloseEdit} onUpdate={onUpdateSubscription}
            />

            <RestartSubscriptionModal
                isOpen={Boolean(restartingSubscription)} isSaving={isSaving} restartingSubscription={restartingSubscription}
                restartForm={restartForm} getMandateOptionsForCustomer={getMandateOptionsForCustomer}
                setRestartForm={setRestartForm} onClose={onCloseRestart} onRestart={onRestartSubscription}
            />
        </>
    );
});
