import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CHOREOGRAPHER_PAGE_SIZE } from '@/entities/Choreographer';
import { Button } from '@/shared/ui/Button';
import cls from '@/shared/ui/layout/layout.module.scss';

export const Pager = memo(
    ({
        page,
        total,
        onChange,
    }: {
        page: number;
        total: number;
        onChange: (page: number) => void;
    }) => {
        const { t } = useTranslation();
        const pages = Math.max(1, Math.ceil(total / CHOREOGRAPHER_PAGE_SIZE));
        if (pages === 1) return null;
        return (
            <div className={cls.actions}>
                <Button
                    disabled={page <= 1}
                    aria-label={t('Previous page')}
                    onClick={() => onChange(page - 1)}
                >
                    ←
                </Button>
                <span className={cls.muted}>{`${page} / ${pages}`}</span>
                <Button
                    disabled={page >= pages}
                    aria-label={t('Next page')}
                    onClick={() => onChange(page + 1)}
                >
                    →
                </Button>
            </div>
        );
    }
);
