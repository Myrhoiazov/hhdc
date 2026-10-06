import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MandateItem.module.scss';
import { Mandate } from '../../model/types/mandate';
import { Card } from '@/shared/ui/Card/Card';

interface MandateItemProps {
    className?: string;
    item: Mandate;
    renderAction?: (mandate: Mandate) => ReactNode;
}

const MandateItem = ({ className, item, renderAction }: MandateItemProps) => {
    const { t } = useTranslation();
    const signatureDate = item.signatureDate
        ? new Date(item.signatureDate).toLocaleDateString('nl-NL')
        : '—';

    return (
        <Card
            padding="16"
            fullWidth
            shadow="shadowLight"
            className={classNames(s.MandateItem, {}, [className])}
        >
            <div className={s.row}>
                <div className={s.main}>
                    <span className={s.id}>{item.id}</span>
                    <span className={s.meta}>{item.method || '—'} · {item.mode || '—'}</span>
                </div>
                <span className={s.date}>{t('Подписан: {{signatureDate}} · изменён: {{updatedDate}}', { signatureDate, updatedDate: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('nl-NL') : '—' })}</span>
                <span className={classNames(s.status, { [s.valid]: item.status === 'valid' }, [])}>
                    {item.status || 'unknown'}
                </span>
                {renderAction?.(item)}
            </div>
        </Card>
    );
};

export default memo(MandateItem);
