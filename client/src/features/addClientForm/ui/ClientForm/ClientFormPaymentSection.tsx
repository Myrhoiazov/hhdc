import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { PayerRelation, payerRelationOptions } from './useClientForm';
import cls from './ClientForm.module.scss';

interface ClientFormPaymentSectionProps {
    mollieCustomerOptions: SelectOption<string>[];
    mollieCustomerId: string;
    setMollieCustomerId: (value: string) => void;
    payerRelation: PayerRelation;
    setPayerRelation: (value: PayerRelation) => void;
}

export const ClientFormPaymentSection = memo((props: ClientFormPaymentSectionProps) => {
    const { mollieCustomerOptions, mollieCustomerId, setMollieCustomerId, payerRelation, setPayerRelation } = props;
    const { t } = useTranslation();

    return (
        <div className={cls.paymentSection}>
            <Text size="s" title={t('Платёжный аккаунт')} bold />
            <Text size="s" text={t('Необязательно. Можно связать существующего плательщика с новым учеником.')} />
            <div className={cls.paymentGrid}>
                <Select
                    label="Mollie payment account"
                    options={mollieCustomerOptions}
                    value={mollieCustomerId}
                    onChange={setMollieCustomerId}
                />
                {mollieCustomerId && (
                    <Select<PayerRelation>
                        label="Роль плательщика"
                        options={payerRelationOptions}
                        value={payerRelation}
                        onChange={setPayerRelation}
                    />
                )}
            </div>
        </div>
    );
});
