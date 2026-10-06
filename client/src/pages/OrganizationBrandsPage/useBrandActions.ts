import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import {
    Brand, Organization, emptyBrand, extractApiErrorMessage,
} from './organizationBrandsTypes';
import { useBrandLogoUpload } from './useBrandLogoUpload';

export const useBrandActions = (
    organization: Organization,
    brandForm: Brand,
    setBrandForm: Dispatch<SetStateAction<Brand>>,
    setSaving: (value: boolean) => void,
    load: () => Promise<void>,
) => {
    const { uploadingLogo, uploadLogo } = useBrandLogoUpload(setBrandForm);

    const saveBrand = async () => {
        if (!organization.id) return toast.error('Сначала сохраните организацию');
        setSaving(true);
        try {
            const payload = { ...brandForm, organizationId: organization.id };
            if (brandForm.id) await $apiPrivate.put(`/company/brands/${brandForm.id}`, payload);
            else await $apiPrivate.post('/company/brands', payload);
            toast.success('Бренд сохранён');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось сохранить бренд'));
        } finally {
            setSaving(false);
        }
    };

    const archive = async (id?: number) => {
        if (!id || !window.confirm('Архивировать бренд? Старые инвойсы сохранят его данные.')) return;
        await $apiPrivate.delete(`/company/brands/${id}`);
        toast.success('Бренд архивирован');
        await load();
    };

    const resetBrandForm = () => setBrandForm(emptyBrand(organization.id));

    return {
        uploadingLogo, saveBrand, uploadLogo, archive, resetBrandForm,
    };
};
