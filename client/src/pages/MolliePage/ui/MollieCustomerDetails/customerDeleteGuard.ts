import { Mandate } from '@/entities/Mandate';
import { MollieSubscription } from '@/entities/MollieSubscription';

// Те же статусы, по которым сервер отказывает в удалении (deleteCustomerController, 409).
const BLOCKING_MANDATE_STATUSES = ['valid', 'pending'];
const BLOCKING_SUBSCRIPTION_STATUSES = ['active', 'pending', 'suspended'];

const hasStatus = (items: { status?: string }[] | undefined, statuses: string[]) => (
    (items ?? []).some((item) => statuses.includes(item.status ?? ''))
);

export const hasDeleteBlockingDependencies = (
    mandates: Mandate[] | undefined,
    subscriptions: MollieSubscription[] | undefined,
) => hasStatus(mandates, BLOCKING_MANDATE_STATUSES) || hasStatus(subscriptions, BLOCKING_SUBSCRIPTION_STATUSES);
