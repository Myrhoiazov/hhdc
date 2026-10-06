import { memo } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './PaymentLinkModal.module.scss';
import { PaymentLinkActions } from './PaymentLinkActions';
import { PaymentLinkFormFields } from './PaymentLinkFormFields';
import { usePaymentLinkModal } from './usePaymentLinkModal';

export interface PaymentLinkPayer {
    id: number;
    name: string;
    email?: string;
}

interface PaymentLinkModalProps {
    clientId: string;
    payers: PaymentLinkPayer[];
    isOpen: boolean;
    onClose: () => void;
    onCreated?: () => void;
}

export const PaymentLinkModal = memo((props: PaymentLinkModalProps) => {
    const { clientId, payers, isOpen, onClose, onCreated } = props;
    const form = usePaymentLinkModal({ clientId, payers, isOpen, onCreated });

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack className={s.form} gap="16" max>
                <div className={s.titleBlock}>
                    <Text size="m" title="Отправить payment link" bold />
                    <Text size="s" text="Создайте одноразовую ссылку Mollie для выбранного плательщика." />
                </div>

                {!payers.length ? (
                    <Text title="Нет связанного плательщика" text="Сначала привяжите Mollie customer к ученику." size="s" />
                ) : (
                    <PaymentLinkFormFields
                        payers={payers} payerOptions={form.payerOptions} payerId={form.payerId}
                        amount={form.amount} description={form.description}
                        isLoading={form.isLoading} checkoutUrl={form.checkoutUrl}
                        onPayerChange={form.setPayerId} onAmountChange={form.setAmount}
                        onDescriptionChange={form.setDescription}
                    />
                )}

                {form.checkoutUrl && (
                    <div className={s.result}>
                        <Text text="Ссылка готова" size="s" bold />
                        <span>{form.checkoutUrl}</span>
                    </div>
                )}

                <PaymentLinkActions
                    payersCount={payers.length} checkoutUrl={form.checkoutUrl} isLoading={form.isLoading}
                    onClose={onClose} onCreate={form.onCreate} onCopy={form.onCopy} onOpen={form.onOpen}
                />
            </VStack>
        </Modal>
    );
});
