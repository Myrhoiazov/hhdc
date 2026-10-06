import { ReactNode, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './CrmPage.module.scss';

export const CrmLayout = memo(({ title, children }: { title: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <Page><div className={cls.CrmPage}><h1>{t(title)}</h1>{children}</div></Page>;
});
export const Field = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <label className={cls.field}><span>{t(label)}</span>{children}</label>;
});
export const RequestState = memo(({ error, loading }: { error: string; loading: boolean }) => {
    const { t } = useTranslation();
    return <>{loading && <p role="status">{t('Loading')}</p>}{error && <p role="alert" className={cls.error}>{error}</p>}</>;
});

const GOOD = ['ACTIVE', 'SUCCEEDED', 'COMPLETED', 'PAID', 'DONE', 'CONNECTED', 'EXECUTED', 'APPROVED'];
const BAD = ['FAILED', 'REJECTED', 'CANCELLED', 'ERROR', 'REVOKED', 'DISABLED'];
export const StatusBadge = memo(({ status }: { status: string }) => {
    const { t } = useTranslation();
    return <span className={classNames(cls.badge, { [cls.success]: GOOD.includes(status), [cls.danger]: BAD.includes(status) })}>{t(status)}</span>;
});
