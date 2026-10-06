import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import {
    Organization, Brand, emptyOrganization, emptyBrand,
} from './organizationBrandsTypes';

export const useOrganizationBrandsData = () => {
    const [organization, setOrganization] = useState<Organization>(emptyOrganization);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [brandForm, setBrandForm] = useState<Brand>(emptyBrand());

    const load = useCallback(async () => {
        const [organizationResponse, brandsResponse] = await Promise.all([
            $apiPrivate.get<Organization | null>('/company/organization'),
            $apiPrivate.get<Brand[]>('/company/brands'),
        ]);
        setOrganization(organizationResponse.data ?? emptyOrganization);
        setBrands(brandsResponse.data);
        setBrandForm(emptyBrand(organizationResponse.data?.id ?? 0));
    }, []);

    useEffect(() => { load(); }, [load]);

    return {
        organization, setOrganization, brands, brandForm, setBrandForm, load,
    };
};
