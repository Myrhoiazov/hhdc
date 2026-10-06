import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvoiceBranch } from '../../model/types';
import { branchAddress } from './useCreateInvoiceModal';
import s from './CreateInvoiceModal.module.scss';

interface InvoiceIssuerDetailsProps {
    branches: InvoiceBranch[];
    addressSource: string;
    businessBrandId: string;
    issuerName: string;
    issuerEmail: string;
    issuerAddress: string;
    bankName: string;
    iban: string;
    note: string;
    onIssuerNameChange: (value: string) => void;
    onIssuerEmailChange: (value: string) => void;
    onSelectAddressSource: (value: string) => void;
    onIssuerAddressChange: (value: string) => void;
    onBankNameChange: (value: string) => void;
    onIbanChange: (value: string) => void;
    onNoteChange: (value: string) => void;
}

export const InvoiceIssuerDetails = memo((props: InvoiceIssuerDetailsProps) => {
    const { t } = useTranslation();
    const {
        branches, addressSource, businessBrandId,
        issuerName, issuerEmail, issuerAddress, bankName, iban, note,
        onIssuerNameChange, onIssuerEmailChange, onSelectAddressSource,
        onIssuerAddressChange, onBankNameChange, onIbanChange, onNoteChange,
    } = props;

    return (
        <details className={s.details}>
            <summary>{t('Реквизиты и примечание')}</summary>
            <div className={s.grid}>
                <label>{t('Компания')}<input value={issuerName} onChange={(event) => onIssuerNameChange(event.target.value)} /></label>
                <label>{t('Email')}<input value={issuerEmail} onChange={(event) => onIssuerEmailChange(event.target.value)} /></label>
                <label>{t('Источник адреса')}
                    <select value={addressSource} onChange={(event) => onSelectAddressSource(event.target.value)}>
                        <option value="manual">{t('Другой адрес / адрес ивента')}</option>
                        {businessBrandId && <option value="brand">{t('Адрес бренда / организации')}</option>}
                        {branches.map((branch) => (
                            <option key={branch.id} value={`branch:${branch.id}`}>
                                {branch.name}{branchAddress(branch) ? ` · ${branchAddress(branch)}` : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <label>{t('Адрес в инвойсе')}
                    <input
                        value={issuerAddress}
                        placeholder="Введите адрес филиала или ивента"
                        onChange={(event) => onIssuerAddressChange(event.target.value)}
                    />
                </label>
                <label>{t('Банк')}<input value={bankName} onChange={(event) => onBankNameChange(event.target.value)} /></label>
                <label>IBAN<input value={iban} onChange={(event) => onIbanChange(event.target.value)} /></label>
                <label>{t('Примечание')}<input value={note} onChange={(event) => onNoteChange(event.target.value)} /></label>
            </div>
        </details>
    );
});
