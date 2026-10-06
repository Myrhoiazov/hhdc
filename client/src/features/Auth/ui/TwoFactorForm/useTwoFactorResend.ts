import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { resendTwoFactorCode } from '../../model/services/resendTwoFactorCode/resendTwoFactorCode';
import { RESEND_COOLDOWN_SECONDS, useResendCooldown } from './useResendCooldown';

export const useTwoFactorResend = (setError: (message?: string) => void) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<string>();
    const { setResendAvailableAt, secondsLeft } = useResendCooldown();

    const onResend = useCallback(async () => {
        setError(undefined);
        setResendMessage(undefined);
        setIsResending(true);
        const result = await dispatch(resendTwoFactorCode());
        setIsResending(false);

        if (result.meta.requestStatus === 'fulfilled') {
            setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
            setResendMessage(t('Код отправлен повторно'));
        } else {
            const payload = result.payload as { message?: string; retryAfterSeconds?: number } | undefined;
            if (payload?.retryAfterSeconds) {
                setResendAvailableAt(Date.now() + payload.retryAfterSeconds * 1000);
            }
            setError(payload?.message || t('Не удалось отправить код повторно'));
        }
    }, [dispatch, t, setResendAvailableAt, setError]);

    return { isResending, resendMessage, secondsLeft, onResend };
};
