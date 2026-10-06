import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvoiceBusinessBrand, InvoiceClient, InvoiceStatus } from '../../model/types';
import s from './CreateInvoiceModal.module.scss';

interface InvoiceFormFieldsProps {
    brands: InvoiceBusinessBrand[];
    clients: InvoiceClient[];
    paidMode: boolean;
    businessBrandId: string;
    clientId: string;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    billToName: string;
    billToEmail: string;
    issueDate: string;
    dueDate: string;
    onSelectBrand: (value: string) => void;
    onSelectClient: (value: string) => void;
    onStatusChange: (value: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>) => void;
    onBillToNameChange: (value: string) => void;
    onBillToEmailChange: (value: string) => void;
    onIssueDateChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
}

const SelectField = ({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) => (
    <label>
        {label}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
            {children}
        </select>
    </label>
);

const BrandSelect = ({
    brands,
    businessBrandId,
    onSelectBrand,
}: {
    brands: InvoiceBusinessBrand[];
    businessBrandId: string;
    onSelectBrand: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <SelectField label={t('Бренд / проект')} value={businessBrandId} onChange={onSelectBrand}>
            <option value="">{t('Реквизиты вручную')}</option>
            {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                    {brand.name}{brand.isDefault ? ' · по умолчанию' : ''}
                </option>
            ))}
        </SelectField>
    );
};

const ClientSelect = ({
    clients,
    clientId,
    onSelectClient,
}: {
    clients: InvoiceClient[];
    clientId: string;
    onSelectClient: (value: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <SelectField label={t('Ученик')} value={clientId} onChange={onSelectClient}>
            <option value="">{t('Без привязки')}</option>
            {clients.map((client) => (
                <option key={client.id} value={client.id}>
                    {[client.firstName, client.lastName].filter(Boolean).join(' ') || `#${client.id}`}
                </option>
            ))}
        </SelectField>
    );
};

interface BillingFieldsProps {
    paidMode: boolean;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    billToName: string;
    billToEmail: string;
    issueDate: string;
    dueDate: string;
    onStatusChange: (value: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>) => void;
    onBillToNameChange: (value: string) => void;
    onBillToEmailChange: (value: string) => void;
    onIssueDateChange: (value: string) => void;
    onDueDateChange: (value: string) => void;
}

const BillingFields = ({
    paidMode, status, billToName, billToEmail, issueDate, dueDate,
    onStatusChange, onBillToNameChange, onBillToEmailChange, onIssueDateChange, onDueDateChange,
}: BillingFieldsProps) => {
    const { t } = useTranslation();
    return (
        <>
            {!paidMode && (
                <label>
                    {t('Статус')}
                    <select value={status} onChange={(event) => onStatusChange(event.target.value as Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>)}>
                        <option value="DRAFT">{t('Черновик')}</option>
                        <option value="ISSUED">{t('Выдан')}</option>
                    </select>
                </label>
            )}
            <label>
                {t('Получатель *')}
                <input value={billToName} onChange={(event) => onBillToNameChange(event.target.value)} />
            </label>
            <label>
                {t('Email получателя')}
                <input type="email" value={billToEmail} onChange={(event) => onBillToEmailChange(event.target.value)} />
            </label>
            <label>
                {t('Дата')}
                <input type="date" value={issueDate} onChange={(event) => onIssueDateChange(event.target.value)} />
            </label>
            {!paidMode && (
                <label>
                    {t('Оплатить до')}
                    <input type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
                </label>
            )}
        </>
    );
};

export const InvoiceFormFields = memo((props: InvoiceFormFieldsProps) => {
    const {
        brands, clients, paidMode,
        businessBrandId, clientId, status,
        billToName, billToEmail, issueDate, dueDate,
        onSelectBrand, onSelectClient, onStatusChange,
        onBillToNameChange, onBillToEmailChange, onIssueDateChange, onDueDateChange,
    } = props;

    return (
        <div className={s.grid}>
            <BrandSelect brands={brands} businessBrandId={businessBrandId} onSelectBrand={onSelectBrand} />
            <ClientSelect clients={clients} clientId={clientId} onSelectClient={onSelectClient} />
            <BillingFields
                paidMode={paidMode}
                status={status}
                billToName={billToName}
                billToEmail={billToEmail}
                issueDate={issueDate}
                dueDate={dueDate}
                onStatusChange={onStatusChange}
                onBillToNameChange={onBillToNameChange}
                onBillToEmailChange={onBillToEmailChange}
                onIssueDateChange={onIssueDateChange}
                onDueDateChange={onDueDateChange}
            />
        </div>
    );
});
