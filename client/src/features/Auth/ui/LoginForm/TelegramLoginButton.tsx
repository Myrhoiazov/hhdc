import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { $api } from '@/shared/api/api';
import cls from './LoginForm.module.scss';

// Unauthenticated — no session/CSRF token exists yet on the login page.
const onTelegramLoginClick = () => {
    window.location.assign(`${__API__}/api/v1/auth/telegram/login/start`);
};

// This page is pre-auth and intentionally outside the app's -redesigned design
// system (see LoginForm.module.scss — hardcoded colors throughout, no theme
// toggle exists before login), so this button matches its hardcoded palette
// rather than pulling in design tokens the rest of the card doesn't use either.
export const TelegramLoginButton = () => {
    const { t } = useTranslation();
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        let cancelled = false;
        $api.get<{ telegram: boolean }>('/auth/providers')
            .then(({ data }) => {
                if (!cancelled) setEnabled(Boolean(data.telegram));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    if (!enabled) return null;

    return (
        <>
            <div className={cls.divider}>
                <span>{t('или')}</span>
            </div>
            <Button
                type="button"
                theme={ButtonTheme.OUTLINE}
                className={cls.telegramBtn}
                fullWidth
                onClick={onTelegramLoginClick}
            >
                {t('Войти через Telegram')}
            </Button>
        </>
    );
};
