import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, BadgeTone } from '../Badge';

const GOOD = [
    'ACTIVE',
    'SUCCEEDED',
    'COMPLETED',
    'PAID',
    'DONE',
    'CONNECTED',
    'EXECUTED',
    'APPROVED',
];
const BAD = ['FAILED', 'REJECTED', 'CANCELLED', 'ERROR', 'REVOKED', 'DISABLED'];

const toneOf = (status: string): BadgeTone | undefined => {
    if (GOOD.includes(status)) return 'success';
    return BAD.includes(status) ? 'danger' : undefined;
};

// A status as a pill: green for what went well, red for what failed, neutral for the rest.
export const StatusBadge = memo(({ status }: { status: string }) => {
    const { t } = useTranslation();
    return <Badge tone={toneOf(status)}>{t(status)}</Badge>;
});
