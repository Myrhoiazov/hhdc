import { TFunction } from 'i18next';
import { SelectOption } from '@/shared/ui/Select/Select';
import { MollieClient } from '@/entities/MollieClient';

export interface Branch {
    id: number;
    name: string;
    isActive?: boolean;
}

export interface DanceGroup {
    id: number;
    name: string;
    style: string;
    level: string;
    branchId?: number | null;
}

export interface MollieCustomersResponse {
    items: MollieClient[];
}

const getMollieCustomerName = (customer: MollieClient) => (
    customer.payerName
    || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
    || customer.email
    || customer.mollieId
    || `Платёжный аккаунт #${customer.id}`
);

export const buildBranchOptions = (branches: Branch[], t: TFunction): SelectOption<string>[] => [
    { value: '', content: t('Без филиала') },
    ...branches.map((branch) => ({ value: String(branch.id), content: branch.name })),
];

export const buildMollieCustomerOptions = (customers: MollieClient[], t: TFunction): SelectOption<string>[] => [
    { value: '', content: t('Не привязывать платёжный аккаунт') },
    ...customers.map((customer) => ({
        value: String(customer.id),
        content: customer.email
            ? `${getMollieCustomerName(customer)} · ${customer.email}`
            : getMollieCustomerName(customer),
    })),
];
