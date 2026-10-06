import { InvoiceStatus } from './types';

export const statusLabel: Record<InvoiceStatus, string> = {
    DRAFT: 'Черновик',
    ISSUED: 'Выдан',
    PARTIALLY_PAID: 'Частично оплачен',
    PAID: 'Оплачен',
    OVERDUE: 'Просрочен',
    CANCELLED: 'Отменён',
};
