import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import cls from '@/shared/ui/layout/layout.module.scss';

export const OneTimeSecret = memo(({ label, value }: { label: string; value: string }) => {
    const { t } = useTranslation();
    return (
        <div role="status">
            <p>{t(label)}</p>
            <p className={cls.secret}>{value}</p>
        </div>
    );
});
