import { classNames } from '@/shared/lib/classNames/classNames';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { useEditSubscriptionDropdown } from './useEditSubscriptionDropdown';
import { SubscriptionModals } from './SubscriptionModals';
import s from './EditSubscriptionDropdown.module.scss';

interface EditSubscriptionDropdownProps {
    className?: string;
    customerId: string;
    subscription: MollieSubscription;
    mandates: Mandate[];
    reloadPage?: () => void;
}

export const EditSubscriptionDropdown = memo((props: EditSubscriptionDropdownProps) => {
    const { className, customerId, subscription, mandates, reloadPage } = props;
    const { t } = useTranslation();
    const state = useEditSubscriptionDropdown(customerId, subscription, mandates, reloadPage);

    return (
        <>
            <div className={classNames(s.rowActions, {}, [className])}>
                {subscription.status === 'active' && (
                    <Button
                        theme={ButtonTheme.OUTLINE_RED}
                        className={s.stopButton}
                        onClick={() => state.setModal('cancel')}
                    >
                        {t('Остановить')}
                    </Button>
                )}
                <Dropdown
                    direction="bottom left"
                    items={state.items}
                    trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />}
                    triggerAriaLabel="Действия подписки"
                />
            </div>
            <SubscriptionModals {...state} />
        </>
    );
});
