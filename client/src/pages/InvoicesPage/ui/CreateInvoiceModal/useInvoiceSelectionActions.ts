import { useCallback } from 'react';
import { InvoiceBranch, InvoiceBusinessBrand, InvoiceClient, InvoiceGroup } from '../../model/types';
import { branchAddress, brandAddress, type FormItem, type useInvoiceFormState } from './useCreateInvoiceModal';

export interface InvoiceSelectionActionsParams {
    formState: ReturnType<typeof useInvoiceFormState>;
    updateItem: (index: number, patch: Partial<FormItem>) => void;
    clients: InvoiceClient[];
    groups: InvoiceGroup[];
    brands: InvoiceBusinessBrand[];
    branches: InvoiceBranch[];
}

export const useInvoiceSelectionActions = ({
    formState, updateItem, clients, groups, brands, branches,
}: InvoiceSelectionActionsParams) => {
    const selectClient = useCallback((value: string) => {
        formState.setClientId(value);
        const client = clients.find((item) => item.id === Number(value));
        if (client) {
            formState.setBillToName([client.firstName, client.lastName].filter(Boolean).join(' '));
            formState.setBillToEmail(client.email ?? '');
        }
    }, [clients, formState]);

    const selectGroup = useCallback((index: number, value: string) => {
        const group = groups.find((item) => item.id === Number(value));
        if (group?.branch && branchAddress(group.branch)) {
            formState.setIssuerAddress(branchAddress(group.branch));
            formState.setAddressSource(`branch:${group.branch.id}`);
        }
        updateItem(index, group ? {
            groupId: value,
            description: `Dance classes — ${group.name}`,
            price: ((group.lessonPriceCents ?? 0) / 100).toFixed(2),
        } : { groupId: value });
    }, [groups, updateItem, formState]);

    const selectBusinessBrand = useCallback((value: string) => {
        formState.setBusinessBrandId(value);
        const brand = brands.find((item) => item.id === Number(value));
        if (brand) {
            formState.setIssuerAddress(brandAddress(brand));
            formState.setAddressSource('brand');
        }
    }, [brands, formState]);

    const selectAddressSource = useCallback((value: string) => {
        formState.setAddressSource(value);
        if (value === 'brand') {
            formState.setIssuerAddress(brandAddress(brands.find((brand) => brand.id === Number(formState.businessBrandId))));
        } else if (value.startsWith('branch:')) {
            const branch = branches.find((item) => item.id === Number(value.slice('branch:'.length)));
            if (branch) formState.setIssuerAddress(branchAddress(branch));
        }
    }, [brands, branches, formState]);

    return { selectClient, selectGroup, selectBusinessBrand, selectAddressSource };
};
