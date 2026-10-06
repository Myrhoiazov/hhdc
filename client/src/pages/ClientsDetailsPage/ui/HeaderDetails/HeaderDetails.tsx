import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack } from '@/shared/ui/Stack';
import s from './HeaderDetails.module.scss';

interface HeaderDetailsProps {
    className?: string;
    userId?: string;
    onEdit?: () => void;
}

const HeaderDetails = (props: HeaderDetailsProps) => {
    const { className, onEdit } = props;
    const { t } = useTranslation();
    const navigate = useNavigate();

    const onBackToList = useCallback(() => {
        navigate(RoutePath.clients);
    }, [navigate]);

    return (
        <div className={classNames(s.HeaderDetails, {}, [className])}>
            <HStack justify="between" gap="16" max>
                <Button theme={ButtonTheme.OUTLINE} onClick={onBackToList}>
                    {t('Назад к списку')}
                </Button>
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onEdit}>
                    {t('Редактировать')}
                </Button>
            </HStack>
        </div>
    );
};

export default memo(HeaderDetails);
