import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/Provider';
import { Button } from '@/shared/ui/Button';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProviderActions } from '../model/useProviderActions';

export const ProviderCardActions = memo(
    ({
        provider,
        actions,
        onConfigure,
    }: {
        provider: ProviderConnection;
        actions: ProviderActions;
        onConfigure?: () => void;
    }) => {
        const { t } = useTranslation();
        const { busy } = actions.action;
        const disabled = provider.status === 'DISABLED';
        return (
            <div className={cls.actions}>
                {actions.verifiable && !disabled && (
                    <Button disabled={busy} onClick={actions.test}>
                        {t('Test connection')}
                    </Button>
                )}
                {provider.type === 'EMAIL' && !disabled && (
                    <Button disabled={busy} onClick={actions.sync}>
                        {t('Sync now')}
                    </Button>
                )}
                {onConfigure && (
                    <Button disabled={busy} onClick={onConfigure}>
                        {t('Configure')}
                    </Button>
                )}
                <Button disabled={busy} onClick={disabled ? actions.enable : actions.disable}>
                    {t(disabled ? 'Enable' : 'Disable')}
                </Button>
                <Button disabled={busy} onClick={actions.remove}>
                    {t('Delete')}
                </Button>
            </div>
        );
    }
);
