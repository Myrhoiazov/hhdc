import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Brand, extractApiErrorMessage } from './organizationBrandsTypes';

export const useBrandLogoUpload = (setBrandForm: Dispatch<SetStateAction<Brand>>) => {
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const response = await $apiPrivate.post<{ url: string }>('/company/brands/upload', form);
            setBrandForm((current) => ({ ...current, logoUrl: response.data.url }));
            toast.success('Логотип загружен');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось загрузить логотип'));
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    return { uploadingLogo, uploadLogo };
};
