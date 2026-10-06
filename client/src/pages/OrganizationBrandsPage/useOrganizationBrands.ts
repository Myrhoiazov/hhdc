import { useState } from 'react';
import { useOrganizationBrandsData } from './useOrganizationBrandsData';
import { useOrganizationActions } from './useOrganizationActions';
import { useBrandActions } from './useBrandActions';

export type { Organization, Brand } from './organizationBrandsTypes';

export const useOrganizationBrands = () => {
    const [saving, setSaving] = useState(false);
    const {
        organization, setOrganization, brands, brandForm, setBrandForm, load,
    } = useOrganizationBrandsData();

    const { saveOrganization, syncMollie } = useOrganizationActions(organization, setSaving, load);
    const {
        uploadingLogo, saveBrand, uploadLogo, archive, resetBrandForm,
    } = useBrandActions(organization, brandForm, setBrandForm, setSaving, load);

    return {
        organization,
        setOrganization,
        brands,
        brandForm,
        setBrandForm,
        saving,
        uploadingLogo,
        saveOrganization,
        syncMollie,
        saveBrand,
        uploadLogo,
        archive,
        resetBrandForm,
    };
};
