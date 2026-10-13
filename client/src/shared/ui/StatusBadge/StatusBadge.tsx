import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './StatusBadge.module.scss';

const GOOD = ['ACTIVE', 'SUCCEEDED', 'COMPLETED', 'PAID', 'DONE', 'CONNECTED', 'EXECUTED', 'APPROVED'];
const BAD = ['FAILED', 'REJECTED', 'CANCELLED', 'ERROR', 'REVOKED', 'DISABLED'];

// A status as a pill: green for what went well, red for what failed, neutral for the rest.
export const StatusBadge = memo(({ status }: { status: string }) => {
    const { t } = useTranslation();
    const tone = { [cls.success]: GOOD.includes(status), [cls.danger]: BAD.includes(status) };
    return <span className={classNames(cls.StatusBadge, tone)}>{t(status)}</span>;
});
