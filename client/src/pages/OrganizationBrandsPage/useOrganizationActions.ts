import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Organization, extractApiErrorMessage } from './organizationBrandsTypes';

export const useOrganizationActions = (
    organization: Organization,
    setSaving: (value: boolean) => void,
    load: () => Promise<void>,
) => {
    const saveOrganization = async () => {
        setSaving(true);
        try {
            await $apiPrivate.put('/company/organization', organization);
            toast.success('Реквизиты организации сохранены');
            await load();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось сохранить организацию'));
        } finally {
            setSaving(false);
        }
    };

    const syncMollie = async () => {
        await $apiPrivate.post('/company/organization/sync-mollie');
        toast.success('Доступные данные Mollie синхронизированы');
        await load();
    };

    return { saveOrganization, syncMollie };
};
