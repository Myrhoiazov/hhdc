import { memo, useCallback } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Invoice, InvoiceStatus } from '../../model/types';
import s from './CreateInvoiceModal.module.scss';
import { useCreateInvoiceModal } from './useCreateInvoiceModal';
import { InvoiceFormFields } from './InvoiceFormFields';
import { InvoiceItemsEditor } from './InvoiceItemsEditor';
import { InvoicePaymentOptions } from './InvoicePaymentOptions';
import { InvoiceIssuerDetails } from './InvoiceIssuerDetails';
import { InvoiceFooter } from './InvoiceFooter';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editInvoice?: Invoice | null;
    paidMode?: boolean;
}

const ModalTitle = ({ editInvoice, paidMode }: { editInvoice?: Invoice | null; paidMode?: boolean }) => (
    <h2>{editInvoice ? `РЕДАКТИРОВАТЬ ${editInvoice.number}` : paidMode ? 'ЧЕРНОВИК ОПЛАЧЕННОГО ИНВОЙСА' : 'НОВЫЙ ИНВОЙС'}</h2>
);

interface InvoiceTopFieldsProps {
    brands: ReturnType<typeof useCreateInvoiceModal>['brands'];
    clients: ReturnType<typeof useCreateInvoiceModal>['clients'];
    paidMode: boolean;
    businessBrandId: string;
    clientId: string;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    billToName: string;
    billToEmail: string;
    issueDate: string;
    dueDate: string;
    onSelectBrand: ReturnType<typeof useCreateInvoiceModal>['selectBusinessBrand'];
    onSelectClient: ReturnType<typeof useCreateInvoiceModal>['selectClient'];
    onStatusChange: ReturnType<typeof useCreateInvoiceModal>['setStatus'];
    onBillToNameChange: ReturnType<typeof useCreateInvoiceModal>['setBillToName'];
    onBillToEmailChange: ReturnType<typeof useCreateInvoiceModal>['setBillToEmail'];
    onIssueDateChange: ReturnType<typeof useCreateInvoiceModal>['setIssueDate'];
    onDueDateChange: ReturnType<typeof useCreateInvoiceModal>['setDueDate'];
}

const InvoiceTopFields = ({
    brands, clients, paidMode, businessBrandId, clientId, status,
    billToName, billToEmail, issueDate, dueDate,
    onSelectBrand, onSelectClient, onStatusChange,
    onBillToNameChange, onBillToEmailChange, onIssueDateChange, onDueDateChange,
}: InvoiceTopFieldsProps) => (
    <InvoiceFormFields
        brands={brands}
        clients={clients}
        paidMode={paidMode}
        businessBrandId={businessBrandId}
        clientId={clientId}
        status={status}
        billToName={billToName}
        billToEmail={billToEmail}
        issueDate={issueDate}
        dueDate={dueDate}
        onSelectBrand={onSelectBrand}
        onSelectClient={onSelectClient}
        onStatusChange={onStatusChange}
        onBillToNameChange={onBillToNameChange}
        onBillToEmailChange={onBillToEmailChange}
        onIssueDateChange={onIssueDateChange}
        onDueDateChange={onDueDateChange}
    />
);

interface InvoiceBottomFieldsProps {
    branches: ReturnType<typeof useCreateInvoiceModal>['branches'];
    addressSource: string;
    businessBrandId: string;
    paidMode: boolean;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
    issuerName: string;
    issuerEmail: string;
    issuerAddress: string;
    bankName: string;
    iban: string;
    note: string;
    items: ReturnType<typeof useCreateInvoiceModal>['items'];
    groups: ReturnType<typeof useCreateInvoiceModal>['groups'];
    totalCents: number;
    saving: boolean;
    onSelectAddressSource: ReturnType<typeof useCreateInvoiceModal>['selectAddressSource'];
    onIssuerNameChange: ReturnType<typeof useCreateInvoiceModal>['setIssuerName'];
    onIssuerEmailChange: ReturnType<typeof useCreateInvoiceModal>['setIssuerEmail'];
    onIssuerAddressChange: ReturnType<typeof useCreateInvoiceModal>['setIssuerAddress'];
    onBankNameChange: ReturnType<typeof useCreateInvoiceModal>['setBankName'];
    onIbanChange: ReturnType<typeof useCreateInvoiceModal>['setIban'];
    onNoteChange: ReturnType<typeof useCreateInvoiceModal>['setNote'];
    onPaymentButtonChange: ReturnType<typeof useCreateInvoiceModal>['setShowPaymentButton'];
    onPaymentQrChange: ReturnType<typeof useCreateInvoiceModal>['setShowPaymentQr'];
    addItem: ReturnType<typeof useCreateInvoiceModal>['addItem'];
    removeItem: ReturnType<typeof useCreateInvoiceModal>['removeItem'];
    selectGroup: ReturnType<typeof useCreateInvoiceModal>['selectGroup'];
    updateItem: ReturnType<typeof useCreateInvoiceModal>['updateItem'];
    editInvoice: boolean;
    onSubmit: ReturnType<typeof useCreateInvoiceModal>['submit'];
}

const InvoiceBottomFields = ({
    branches, addressSource, businessBrandId, paidMode, showPaymentButton, showPaymentQr,
    issuerName, issuerEmail, issuerAddress, bankName, iban, note,
    items, groups, totalCents, saving,
    onSelectAddressSource, onIssuerNameChange, onIssuerEmailChange, onIssuerAddressChange,
    onBankNameChange, onIbanChange, onNoteChange,
    onPaymentButtonChange, onPaymentQrChange,
    addItem, removeItem, selectGroup, updateItem,
    editInvoice, onSubmit,
}: InvoiceBottomFieldsProps) => (
    <>
        <InvoiceItemsEditor
            items={items} groups={groups} onAdd={addItem} onRemove={removeItem}
            onSelectGroup={selectGroup} onUpdateItem={updateItem}
        />

        <InvoicePaymentOptions
            paidMode={paidMode} showPaymentButton={showPaymentButton} showPaymentQr={showPaymentQr}
            onPaymentButtonChange={onPaymentButtonChange} onPaymentQrChange={onPaymentQrChange}
        />

        <InvoiceIssuerDetails
            branches={branches} addressSource={addressSource} businessBrandId={businessBrandId}
            issuerName={issuerName} issuerEmail={issuerEmail} issuerAddress={issuerAddress}
            bankName={bankName} iban={iban} note={note}
            onIssuerNameChange={onIssuerNameChange} onIssuerEmailChange={onIssuerEmailChange}
            onSelectAddressSource={onSelectAddressSource} onIssuerAddressChange={onIssuerAddressChange}
            onBankNameChange={onBankNameChange} onIbanChange={onIbanChange} onNoteChange={onNoteChange}
        />

        <InvoiceFooter
            totalCents={totalCents} saving={saving} editInvoice={editInvoice} paidMode={paidMode} onSubmit={onSubmit}
        />
    </>
);

export const CreateInvoiceModal = memo(({ isOpen, onClose, onSaved, editInvoice, paidMode = false }: Props) => {
    const {
        clients, brands, branches, groups, businessBrandId, addressSource, clientId,
        billToName, setBillToName, billToEmail, setBillToEmail, issueDate, setIssueDate, dueDate, setDueDate,
        status, setStatus, issuerName, setIssuerName, issuerAddress, setIssuerAddress, issuerEmail, setIssuerEmail,
        bankName, setBankName, iban, setIban, note, setNote,
        showPaymentButton, setShowPaymentButton, showPaymentQr, setShowPaymentQr, items, saving, totalCents,
        updateItem, addItem, removeItem, selectClient, selectGroup, selectBusinessBrand, selectAddressSource,
        setAddressSource, submit,
    } = useCreateInvoiceModal({ isOpen, onClose, onSaved, editInvoice, paidMode });

    const onManualAddressChange = useCallback((value: string) => {
        setIssuerAddress(value);
        setAddressSource('manual');
    }, [setIssuerAddress, setAddressSource]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <ModalTitle editInvoice={editInvoice} paidMode={paidMode} />

                <InvoiceTopFields
                    brands={brands} clients={clients} paidMode={paidMode} businessBrandId={businessBrandId}
                    clientId={clientId} status={status} billToName={billToName} billToEmail={billToEmail}
                    issueDate={issueDate} dueDate={dueDate}
                    onSelectBrand={selectBusinessBrand} onSelectClient={selectClient} onStatusChange={setStatus}
                    onBillToNameChange={setBillToName} onBillToEmailChange={setBillToEmail}
                    onIssueDateChange={setIssueDate} onDueDateChange={setDueDate}
                />

                <InvoiceBottomFields
                    branches={branches} addressSource={addressSource} businessBrandId={businessBrandId}
                    paidMode={paidMode} showPaymentButton={showPaymentButton} showPaymentQr={showPaymentQr}
                    issuerName={issuerName} issuerEmail={issuerEmail} issuerAddress={issuerAddress}
                    bankName={bankName} iban={iban} note={note}
                    items={items} groups={groups} totalCents={totalCents} saving={saving}
                    onSelectAddressSource={selectAddressSource} onIssuerNameChange={setIssuerName}
                    onIssuerEmailChange={setIssuerEmail} onIssuerAddressChange={onManualAddressChange}
                    onBankNameChange={setBankName} onIbanChange={setIban} onNoteChange={setNote}
                    onPaymentButtonChange={setShowPaymentButton} onPaymentQrChange={setShowPaymentQr}
                    addItem={addItem} removeItem={removeItem} selectGroup={selectGroup} updateItem={updateItem}
                    editInvoice={Boolean(editInvoice)} onSubmit={submit}
                />
            </div>
        </Modal>
    );
});
