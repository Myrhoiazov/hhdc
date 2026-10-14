import { FormEvent, useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getLoginEmail } from '../../model/selectors/getLoginEmail/getLoginEmail';
import { getLoginPassword } from '../../model/selectors/getLoginPassword/getLoginPassword';
import { getLoginIsLoading } from '../../model/selectors/getLoginIsLoading/getLoginIsLoading';
import { getLoginError } from '../../model/selectors/getLoginError/getLoginError';
import { loginByUsername } from '../../model/services/loginByUsername/loginByUsername';
import { loginActions } from '../../model/slice/authSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

interface UseLoginFormParams {
    onSuccess?: () => void;
}

const useCaptchaChallenge = () => {
    const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
    const captchaTokenRef = useRef<string | undefined>(undefined);

    const clearCaptchaToken = useCallback((resetWidget = false) => {
        captchaTokenRef.current = undefined;
        if (resetWidget) {
            setCaptchaWidgetKey((value) => value + 1);
        }
    }, []);

    const onCaptchaVerify = useCallback((token: string) => {
        captchaTokenRef.current = token;
    }, []);

    return { captchaTokenRef, captchaWidgetKey, clearCaptchaToken, onCaptchaVerify };
};

const useLoginSubmit = (
    credentials: { email: string; password: string },
    captchaRequired: boolean,
    captcha: ReturnType<typeof useCaptchaChallenge>,
    deps: {
        dispatch: ReturnType<typeof useAppDispatch>;
        onSuccess?: () => void;
        setPendingMaskedEmail: (value: string | undefined) => void;
    }
) => {
    const { email, password } = credentials;
    const { captchaTokenRef, clearCaptchaToken } = captcha;
    const { dispatch, onSuccess, setPendingMaskedEmail } = deps;

    const onChangeEmail = useCallback(
        (value: string) => {
            dispatch(loginActions.cleanError());
            clearCaptchaToken(true);
            dispatch(loginActions.setUseremail(value));
        },
        [clearCaptchaToken, dispatch]
    );

    const onChangePassword = useCallback(
        (value: string) => {
            dispatch(loginActions.cleanError());
            clearCaptchaToken(true);
            dispatch(loginActions.setPassword(value));
        },
        [clearCaptchaToken, dispatch]
    );

    const onLoginClick = useCallback(async () => {
        const captchaTokenValue = captchaTokenRef.current;
        if (captchaRequired && !captchaTokenValue) return;

        const authData = captchaTokenValue
            ? { email, password, captchaToken: captchaTokenValue }
            : { email, password };
        const result = await dispatch(loginByUsername(authData));
        if (captchaTokenValue) {
            clearCaptchaToken(true);
        }
        if (result.meta.requestStatus !== 'fulfilled') return;
        const payload = result.payload;
        if (payload && 'requiresTwoFactor' in payload) {
            setPendingMaskedEmail(payload.maskedEmail);
        } else {
            onSuccess?.();
        }
    }, [
        captchaRequired,
        clearCaptchaToken,
        onSuccess,
        dispatch,
        password,
        email,
        captchaTokenRef,
        setPendingMaskedEmail,
    ]);

    const onSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void onLoginClick();
        },
        [onLoginClick]
    );

    return { onChangeEmail, onChangePassword, onSubmit };
};

export const useLoginForm = ({ onSuccess }: UseLoginFormParams) => {
    const email = useSelector(getLoginEmail);
    const password = useSelector(getLoginPassword);
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getLoginIsLoading);
    const error = useSelector(getLoginError);
    const [pendingMaskedEmail, setPendingMaskedEmail] = useState<string>();
    const captcha = useCaptchaChallenge();

    const captchaRequired = error?.code === 'CAPTCHA_REQUIRED' || error?.code === 'CAPTCHA_INVALID';
    const { onChangeEmail, onChangePassword, onSubmit } = useLoginSubmit(
        { email, password },
        captchaRequired,
        captcha,
        { dispatch, onSuccess, setPendingMaskedEmail }
    );

    const onBackToCredentials = useCallback(() => {
        setPendingMaskedEmail(undefined);
    }, []);

    return {
        email,
        password,
        isLoading,
        error,
        pendingMaskedEmail,
        onChangeEmail,
        onChangePassword,
        onSubmit,
        onBackToCredentials,
        captchaRequired,
        captchaSiteKey: error?.siteKey,
        captchaWidgetKey: captcha.captchaWidgetKey,
        onCaptchaVerify: captcha.onCaptchaVerify,
        onCaptchaReset: captcha.clearCaptchaToken,
    };
};
