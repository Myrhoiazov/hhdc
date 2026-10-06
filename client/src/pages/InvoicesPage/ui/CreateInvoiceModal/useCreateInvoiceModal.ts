import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import {
    Invoice,
    InvoiceBranch,
    InvoiceBusinessBrand,
    InvoiceClient,
    InvoiceGroup,
    InvoiceStatus,
} from '../../model/types';
import { fillFormFromInvoice, resetFormToDefaults } from './invoiceEditFillHelpers';
import { useInvoiceItemActions } from './useInvoiceItemActions';
import { useInvoiceSelectionActions } from './useInvoiceSelectionActions';
import { useInvoiceSubmitAction } from './useInvoiceSubmitAction';

export interface FormItem {
    groupId: string;
    description: string;
    period: string;
    quantity: number;
    price: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editInvoice?: Invoice | null;
    paidMode?: boolean;
}

export const today = () => new Date().toISOString().slice(0, 10);

export const inFiveBusinessDays = () => {
    const value = new Date();
    let days = 0;
    while (days < 5) {
        value.setDate(value.getDate() + 1);
        if (value.getDay() !== 0 && value.getDay() !== 6) days += 1;
    }
    return value.toISOString().slice(0, 10);
};

export const emptyItem = (): FormItem => ({ groupId: '', description: '', period: '', quantity: 1, price: '0.00' });

export const dateInputValue = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const branchAddress = (branch: InvoiceBranch) => [branch.address, branch.city].filter(Boolean).join(', ');

export const brandAddress = (brand?: InvoiceBusinessBrand) => brand?.address ?? [
    brand?.organization?.registrationAddress,
    brand?.organization?.postalCode,
    brand?.organization?.city,
].filter(Boolean).join(', ');

export interface UseCreateInvoiceModalResult {
    clients: InvoiceClient[];
    brands: InvoiceBusinessBrand[];
    branches: InvoiceBranch[];
    groups: InvoiceGroup[];
    businessBrandId: string;
    setBusinessBrandId: Dispatch<SetStateAction<string>>;
    addressSource: string;
    setAddressSource: Dispatch<SetStateAction<string>>;
    clientId: string;
    billToName: string;
    setBillToName: (value: string) => void;
    billToEmail: string;
    setBillToEmail: (value: string) => void;
    issueDate: string;
    setIssueDate: (value: string) => void;
    dueDate: string;
    setDueDate: (value: string) => void;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    setStatus: (value: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>) => void;
    issuerName: string;
    setIssuerName: (value: string) => void;
    issuerAddress: string;
    setIssuerAddress: (value: string) => void;
    issuerEmail: string;
    setIssuerEmail: (value: string) => void;
    bankName: string;
    setBankName: (value: string) => void;
    iban: string;
    setIban: (value: string) => void;
    note: string;
    setNote: (value: string) => void;
    showPaymentButton: boolean;
    setShowPaymentButton: (value: boolean) => void;
    showPaymentQr: boolean;
    setShowPaymentQr: (value: boolean) => void;
    items: FormItem[];
    setItems: (updater: (current: FormItem[]) => FormItem[]) => void;
    saving: boolean;
    totalCents: number;
    updateItem: (index: number, patch: Partial<FormItem>) => void;
    addItem: () => void;
    removeItem: (index: number) => void;
    selectClient: (value: string) => void;
    selectGroup: (index: number, value: string) => void;
    selectBusinessBrand: (value: string) => void;
    selectAddressSource: (value: string) => void;
    submit: () => void;
    editInvoice?: Invoice | null;
    paidMode: boolean;
}

export const useInvoiceFormState = () => {
    const [businessBrandId, setBusinessBrandId] = useState('');
    const [addressSource, setAddressSource] = useState('manual');
    const [clientId, setClientId] = useState('');
    const [billToName, setBillToName] = useState('');
    const [billToEmail, setBillToEmail] = useState('');
    const [issueDate, setIssueDate] = useState(today());
    const [dueDate, setDueDate] = useState(inFiveBusinessDays());
    const [status, setStatus] = useState<Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>>('DRAFT');
    const [issuerName, setIssuerName] = useState('Talent Center DDC');
    const [issuerAddress, setIssuerAddress] = useState('');
    const [issuerEmail, setIssuerEmail] = useState('');
    const [bankName, setBankName] = useState('');
    const [iban, setIban] = useState('');
    const [note, setNote] = useState('');
    const [showPaymentButton, setShowPaymentButton] = useState(true);
    const [showPaymentQr, setShowPaymentQr] = useState(true);
    const [items, setItems] = useState<FormItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);
    return {
        businessBrandId, setBusinessBrandId,
        addressSource, setAddressSource,
        clientId, setClientId,
        billToName, setBillToName,
        billToEmail, setBillToEmail,
        issueDate, setIssueDate,
        dueDate, setDueDate,
        status, setStatus,
        issuerName, setIssuerName,
        issuerAddress, setIssuerAddress,
        issuerEmail, setIssuerEmail,
        bankName, setBankName,
        iban, setIban,
        note, setNote,
        showPaymentButton, setShowPaymentButton,
        showPaymentQr, setShowPaymentQr,
        items, setItems,
        saving, setSaving,
    };
};

const useInvoiceData = ({ isOpen }: { isOpen: boolean }) => {
    const [clients, setClients] = useState<InvoiceClient[]>([]);
    const [groups, setGroups] = useState<InvoiceGroup[]>([]);
    const [brands, setBrands] = useState<InvoiceBusinessBrand[]>([]);
    const [branches, setBranches] = useState<InvoiceBranch[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([
            $apiPrivate.get<InvoiceClient[]>('/clients'),
            $apiPrivate.get<{ data: InvoiceGroup[] }>('/schedule/groups', { params: { limit: 100 } }),
            $apiPrivate.get<InvoiceBusinessBrand[]>('/company/brands'),
            $apiPrivate.get<InvoiceBranch[]>('/company/branches'),
        ]).then(([clientsResponse, groupsResponse, brandsResponse, branchesResponse]) => {
            setClients(clientsResponse.data.map((client) => ({ ...client, id: Number(client.id) })));
            setGroups(groupsResponse.data.data);
            setBrands(brandsResponse.data.filter((brand) => brand.isActive !== false));
            setBranches(branchesResponse.data.filter((branch) => branch.isActive !== false));
        });
    }, [isOpen]);

    return { clients, groups, brands, branches };
};

const useInvoiceEditFill = ({ isOpen, editInvoice, paidMode, formState }: {
    isOpen: boolean;
    editInvoice?: Invoice | null;
    paidMode: boolean;
    formState: ReturnType<typeof useInvoiceFormState>;
}) => {
    useEffect(() => {
        if (!isOpen) return;
        if (editInvoice) {
            fillFormFromInvoice(formState, editInvoice);
        } else {
            resetFormToDefaults(formState);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editInvoice, isOpen, paidMode]);
};

export const useCreateInvoiceModal = ({ isOpen, onClose, onSaved, editInvoice, paidMode = false }: Props): UseCreateInvoiceModalResult => {
    const formState = useInvoiceFormState();
    const { clients, groups, brands, branches } = useInvoiceData({ isOpen });
    useInvoiceEditFill({ isOpen, editInvoice, paidMode, formState });

    useEffect(() => {
        if (!isOpen || editInvoice || formState.businessBrandId) return;
        const defaultBrand = brands.find((brand) => brand.isDefault);
        if (defaultBrand) {
            formState.setBusinessBrandId(String(defaultBrand.id));
            formState.setIssuerAddress(brandAddress(defaultBrand));
            formState.setAddressSource('brand');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brands, formState.businessBrandId, editInvoice, isOpen]);

    const { updateItem, addItem, removeItem } = useInvoiceItemActions(formState);
    const { selectClient, selectGroup, selectBusinessBrand, selectAddressSource } =
        useInvoiceSelectionActions({ formState, updateItem, clients, groups, brands, branches });
    const { totalCents, submit } = useInvoiceSubmitAction(formState, editInvoice, paidMode, onSaved, onClose);

    return {
        clients, brands, branches, groups,
        businessBrandId: formState.businessBrandId, setBusinessBrandId: formState.setBusinessBrandId,
        addressSource: formState.addressSource, setAddressSource: formState.setAddressSource,
        clientId: formState.clientId,
        billToName: formState.billToName, setBillToName: formState.setBillToName,
        billToEmail: formState.billToEmail, setBillToEmail: formState.setBillToEmail,
        issueDate: formState.issueDate, setIssueDate: formState.setIssueDate,
        dueDate: formState.dueDate, setDueDate: formState.setDueDate,
        status: formState.status, setStatus: formState.setStatus,
        issuerName: formState.issuerName, setIssuerName: formState.setIssuerName,
        issuerAddress: formState.issuerAddress, setIssuerAddress: formState.setIssuerAddress,
        issuerEmail: formState.issuerEmail, setIssuerEmail: formState.setIssuerEmail,
        bankName: formState.bankName, setBankName: formState.setBankName,
        iban: formState.iban, setIban: formState.setIban,
        note: formState.note, setNote: formState.setNote,
        showPaymentButton: formState.showPaymentButton, setShowPaymentButton: formState.setShowPaymentButton,
        showPaymentQr: formState.showPaymentQr, setShowPaymentQr: formState.setShowPaymentQr,
        items: formState.items, setItems: formState.setItems,
        saving: formState.saving,
        totalCents,
        updateItem, addItem, removeItem,
        selectClient, selectGroup, selectBusinessBrand, selectAddressSource, submit,
        editInvoice, paidMode,
    };
};
