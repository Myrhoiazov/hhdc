import { FormEvent, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getLoginEmail } from '../../model/selectors/getLoginEmail/getLoginEmail';
import { getLoginPassword } from '../../model/selectors/getLoginPassword/getLoginPassword';
import { getLoginIsLoading } from '../../model/selectors/getLoginIsLoading/getLoginIsLoading';
import { getLoginError } from '../../model/selectors/getLoginError/getLoginError';
import { loginByUsername } from '../../model/services/loginByUsername/loginByUsername';
import { loginActions } from '../../model/slice/authSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

export const useLoginForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    const email = useSelector(getLoginEmail);
    const password = useSelector(getLoginPassword);
    const isLoading = useSelector(getLoginIsLoading);
    const error = useSelector(getLoginError);
    const dispatch = useAppDispatch();
    const onChangeEmail = useCallback((value: string) => { dispatch(loginActions.setUseremail(value)); }, [dispatch]);
    const onChangePassword = useCallback((value: string) => { dispatch(loginActions.setPassword(value)); }, [dispatch]);
    const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const result = await dispatch(loginByUsername({ email, password }));
        if (result.meta.requestStatus === 'fulfilled') onSuccess?.();
    }, [dispatch, email, password, onSuccess]);
    return { email, password, isLoading, error, onChangeEmail, onChangePassword, onSubmit };
};
