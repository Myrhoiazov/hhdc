import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './MollieClientAction.module.scss';
import { HStack } from '@/shared/ui/Stack';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Button } from '@/shared/ui/Button';
import AddClientIcon from '@/shared/assets/icons/add_user_icon.svg';
import { MollieClientFormModal } from '@/features/addMollieClientForm';

interface MollieClientActionProps {
    className?: string;
    reloadPage?: () => void;
}

export const MollieClientAction = memo((props: MollieClientActionProps) => {
    const { className, reloadPage } = props;
    const [isAddClientModal, setIsAddClientModal] = useState(false);

    const onCloseModal = useCallback(() => {
        setIsAddClientModal(false);
    }, []);

    const onShowModal = useCallback(() => {
        setIsAddClientModal(true);
    }, []);

    const { t } = useTranslation();

    return (
        <div className={classNames(s.MollieClientAction, {}, [className])}>
            <HStack gap="32" justify="end" align="center" max>
                <Button onClick={onShowModal} className={s.btn}>
                    {t('Добавить клиента')}
                    <Icon Svg={AddClientIcon} width={24} color="fill" />
                </Button>
            </HStack>
            <MollieClientFormModal
                isOpen={isAddClientModal}
                onClose={onCloseModal}
                reloadPage={reloadPage}
            />
        </div>
    );
});
