import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FormEvent } from 'react';
import { getLoginEmail } from '../../model/selectors/getLoginEmail/getLoginEmail';
import { getLoginPassword } from '../../model/selectors/getLoginPassword/getLoginPassword';
import { getLoginIsLoading } from '../../model/selectors/getLoginIsLoading/getLoginIsLoading';
import { getLoginError } from '../../model/selectors/getLoginError/getLoginError';
import { loginByUsername } from '../../model/services/loginByUsername/loginByUsername';
import { loginActions } from '../../model/slice/authSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

// Conceptual codes from docs/spec/DDC_CRM_TELEGRAM_AUTH_SPEC.md §13, mapped to
// project naming (LOGIN_TELEGRAM_FAILED audit reasons on the server side).
// TELEGRAM_NOT_LINKED gets the spec's recommended user-facing text verbatim;
// everything else is a generic retry message — none of these disclose whether
// a CRM account exists for the Telegram identity (avoids account enumeration).
const TELEGRAM_ERROR_MESSAGES: Record<string, string> = {
    TELEGRAM_NOT_LINKED: 'Этот Telegram-аккаунт не подключён к HHDC Admin. Войдите с помощью электронной почты и подключите Telegram в настройках профиля.',
    OIDC_CANCELLED: 'Вход через Telegram отменён.',
    // Server-side this single code covers a missing/disabled account or a
    // non-ADMIN role — deliberately collapsed to avoid disclosing which one
    // (account enumeration), but still distinct from a generic OIDC failure.
    USER_NOT_AUTHORIZED: 'Этот аккаунт не может войти через Telegram. Обратитесь к администратору.',
};
const DEFAULT_TELEGRAM_ERROR_MESSAGE = 'Не удалось войти через Telegram. Попробуйте снова.';

interface UseLoginFormParams {
    onSuccess?: () => void;
}

type TelegramRedirectOutcome =
    | { kind: 'error'; error: { status: number; code: string; message: string } }
    | { kind: 'two_factor'; maskedEmail: string }
    | null;

// status must not be 401 — LoginFormError hardcodes a generic "wrong email/password" message
// for exactly that status and would silently discard the Telegram-specific message here.
const resolveTelegramRedirectOutcome = (
    telegramStatus: string | null,
    telegramError: string | null,
    maskedEmail: string | null,
): TelegramRedirectOutcome => {
    if (telegramError) {
        return {
            kind: 'error',
            error: { status: 400, code: telegramError, message: TELEGRAM_ERROR_MESSAGES[telegramError] ?? DEFAULT_TELEGRAM_ERROR_MESSAGE },
        };
    }
    if (telegramStatus === 'two_factor' && maskedEmail) {
        return { kind: 'two_factor', maskedEmail };
    }
    return null;
};

// Reads the ?telegramStatus=.../?telegramError=... this page was redirected back to from
// GET /auth/telegram/callback (a full browser navigation, not an XHR — there is no other way
// for this result to reach the SPA) and routes it into the exact same UI a password-login
// outcome would use.
const useTelegramRedirectOutcome = (
    dispatch: ReturnType<typeof useAppDispatch>,
    setPendingMaskedEmail: (value: string | undefined) => void,
) => {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const telegramStatus = params.get('telegramStatus');
        const telegramError = params.get('telegramError');
        if (!telegramStatus && !telegramError) return;

        const outcome = resolveTelegramRedirectOutcome(telegramStatus, telegramError, params.get('maskedEmail'));
        if (outcome?.kind === 'error') dispatch(loginActions.setError(outcome.error));
        else if (outcome?.kind === 'two_factor') setPendingMaskedEmail(outcome.maskedEmail);

        params.delete('telegramStatus');
        params.delete('telegramError');
        params.delete('maskedEmail');
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
        // Intentionally runs once on mount only — this reads the query string
        // exactly once, the way a redirect landing is meant to be consumed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

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
    deps: { dispatch: ReturnType<typeof useAppDispatch>; onSuccess?: () => void; setPendingMaskedEmail: (value: string | undefined) => void },
) => {
    const { email, password } = credentials;
    const { captchaTokenRef, clearCaptchaToken } = captcha;
    const { dispatch, onSuccess, setPendingMaskedEmail } = deps;

    const onChangeEmail = useCallback((value: string) => {
        dispatch(loginActions.cleanError());
        clearCaptchaToken(true);
        dispatch(loginActions.setUseremail(value));
    }, [clearCaptchaToken, dispatch]);

    const onChangePassword = useCallback((value: string) => {
        dispatch(loginActions.cleanError());
        clearCaptchaToken(true);
        dispatch(loginActions.setPassword(value));
    }, [clearCaptchaToken, dispatch]);

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
    }, [captchaRequired, clearCaptchaToken, onSuccess, dispatch, password, email, captchaTokenRef, setPendingMaskedEmail]);

    const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onLoginClick();
    }, [onLoginClick]);

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

    useTelegramRedirectOutcome(dispatch, setPendingMaskedEmail);

    const captchaRequired = error?.code === 'CAPTCHA_REQUIRED' || error?.code === 'CAPTCHA_INVALID';
    const { onChangeEmail, onChangePassword, onSubmit } = useLoginSubmit(
        { email, password },
        captchaRequired,
        captcha,
        { dispatch, onSuccess, setPendingMaskedEmail },
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
