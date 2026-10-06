import { memo } from 'react';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { Card } from '@/shared/ui/Card/Card';
import { classNames } from '@/shared/lib/classNames/classNames';
import { loginReducer } from '../../model/slice/authSlice';
import { useLoginForm } from './useLoginForm';
import { LoginFormHeader } from './LoginFormHeader';
import { LoginFormFields } from './LoginFormFields';
import { LoginFormError } from './LoginFormError';
import { LoginFormActions } from './LoginFormActions';
import cls from './LoginForm.module.scss';

export interface LoginFormProps { className?: string; onSuccess?: () => void }
const reducers: ReducersList = { loginForm: loginReducer };
const CredentialsForm = memo(({ className, onSuccess }: LoginFormProps) => {
    const form = useLoginForm({ onSuccess });
    return <Card className={classNames(cls.LoginForm, {}, [className])} padding="40"><form onSubmit={form.onSubmit}><LoginFormHeader /><LoginFormFields {...form} /><LoginFormError error={form.error} /><LoginFormActions isLoading={form.isLoading} /></form></Card>;
});
const LoginForm = memo((props: LoginFormProps) => <DynamicModuleLoader reducers={reducers}><CredentialsForm {...props} /></DynamicModuleLoader>);
export default LoginForm;
