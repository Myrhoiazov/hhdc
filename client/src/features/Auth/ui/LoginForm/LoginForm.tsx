import { memo } from 'react';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { Card } from '@/shared/ui/Card/Card';
import { VStack } from '@/shared/ui/Stack';
import { TurnstileWidget } from '@/shared/ui/TurnstileWidget/TurnstileWidget';
import { classNames } from '@/shared/lib/classNames/classNames';
import { loginReducer } from '../../model/slice/authSlice';
import { TwoFactorForm } from '../TwoFactorForm/TwoFactorForm';
import { useLoginForm } from './useLoginForm';
import { LoginFormHeader } from './LoginFormHeader';
import { LoginFormFields } from './LoginFormFields';
import { LoginFormError } from './LoginFormError';
import { LoginFormActions } from './LoginFormActions';
import cls from './LoginForm.module.scss';

export interface LoginFormProps { className?: string; onSuccess?: () => void }
const reducers: ReducersList = { loginForm: loginReducer };

type CredentialsViewProps = ReturnType<typeof useLoginForm> & { className?: string };

const CaptchaChallenge = ({ captchaRequired, captchaSiteKey, captchaWidgetKey, onCaptchaVerify, onCaptchaReset }: CredentialsViewProps) => {
    if (!captchaRequired || !captchaSiteKey) return null;
    return (
        <VStack align="center" className={cls.captcha}>
            <TurnstileWidget key={captchaWidgetKey} siteKey={captchaSiteKey} onVerify={onCaptchaVerify} onReset={onCaptchaReset} />
        </VStack>
    );
};

const CredentialsView = (form: CredentialsViewProps) => (
    <Card className={classNames(cls.LoginForm, {}, [form.className])} padding="40">
        <form onSubmit={form.onSubmit}>
            <LoginFormHeader />
            <LoginFormFields {...form} />
            <CaptchaChallenge {...form} />
            <LoginFormError error={form.error} />
            <LoginFormActions isLoading={form.isLoading} />
        </form>
    </Card>
);

const CredentialsForm = memo(({ className, onSuccess }: LoginFormProps) => {
    const form = useLoginForm({ onSuccess });

    if (form.pendingMaskedEmail) {
        return <TwoFactorForm className={className} maskedEmail={form.pendingMaskedEmail} onSuccess={onSuccess} onBack={form.onBackToCredentials} />;
    }
    return <CredentialsView className={className} {...form} />;
});
const LoginForm = memo((props: LoginFormProps) => <DynamicModuleLoader reducers={reducers}><CredentialsForm {...props} /></DynamicModuleLoader>);
export default LoginForm;
