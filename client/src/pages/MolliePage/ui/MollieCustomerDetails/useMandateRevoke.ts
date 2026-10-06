import axios from 'axios';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Mandate } from '@/entities/Mandate';

export const useMandateRevoke = (customerId: string | undefined, onReloadCustomerDetails: () => void) => (
    async (mandate: Mandate) => {
        if (!customerId || mandate.status !== 'valid' || !mandate.id
            || !window.confirm('Отозвать mandate? Все связанные активные подписки будут отменены. Действие необратимо.')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/customers/${customerId}/mandates/${mandate.id}`);
            toast.success('Mandate отозван');
            onReloadCustomerDetails();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    }
);
