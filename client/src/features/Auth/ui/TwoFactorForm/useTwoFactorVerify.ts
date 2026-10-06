import { FormEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { verifyTwoFactorCode } from '../../model/services/verifyTwoFactorCode/verifyTwoFactorCode';

export const useTwoFactorVerify = (setError: (message?: string) => void, onSuccess?: () => void) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [code, setCode] = useState('');
    const [trustDevice, setTrustDevice] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const onChangeCode = useCallback((value: string) => {
        setError(undefined);
        setCode(value.replace(/\D/g, '').slice(0, 6));
    }, [setError]);

    const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (code.length !== 6) {
            setError(t('Введите 6-значный код'));
            return;
        }

        setError(undefined);
        setIsVerifying(true);
        const result = await dispatch(verifyTwoFactorCode({ code, trustDevice }));
        setIsVerifying(false);

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess?.();
        } else {
            const payload = result.payload as { message?: string } | undefined;
            setError(payload?.message || t('Не удалось подтвердить код'));
        }
    }, [code, trustDevice, dispatch, onSuccess, t, setError]);

    return { code, trustDevice, setTrustDevice, isVerifying, onChangeCode, onSubmit };
};
