import { memo } from 'react';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { loginReducer } from '../../model/slice/authSlice';
import { classNames } from '@/shared/lib/classNames/classNames';
import { VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { TwoFactorForm } from '../TwoFactorForm/TwoFactorForm';
import { useLoginForm } from './useLoginForm';
import { LoginFormHeader } from './LoginFormHeader';
import { LoginFormFields } from './LoginFormFields';
import { LoginFormError } from './LoginFormError';
import { LoginFormActions } from './LoginFormActions';
import { TurnstileWidget } from '@/shared/ui/TurnstileWidget/TurnstileWidget';
import { TelegramLoginButton } from './TelegramLoginButton';
import cls from './LoginForm.module.scss';

export interface LoginFormProps {
    className?: string;
    onSuccess?: () => void;
}

const initialReducers: ReducersList = {
    loginForm: loginReducer,
};

type CredentialsViewProps = ReturnType<typeof useLoginForm> & { className?: string };

const CredentialsView = ({
    className, email, password, isLoading, error, onChangeEmail, onChangePassword, onSubmit,
    captchaRequired, captchaSiteKey, captchaWidgetKey, onCaptchaVerify, onCaptchaReset,
}: CredentialsViewProps) => (
    <DynamicModuleLoader reducers={initialReducers}>
        <Card
            className={classNames(cls.LoginForm, {}, [className])}
            padding="40"
        >
            <form onSubmit={onSubmit}>
                <VStack align="center">
                    <LoginFormHeader />
                </VStack>
                <LoginFormFields
                    email={email}
                    password={password}
                    onChangeEmail={onChangeEmail}
                    onChangePassword={onChangePassword}
                />
                {captchaRequired && captchaSiteKey && (
                    <VStack align="center" className={cls.captcha}>
                        <TurnstileWidget
                            key={captchaWidgetKey}
                            siteKey={captchaSiteKey}
                            onVerify={onCaptchaVerify}
                            onReset={onCaptchaReset}
                        />
                    </VStack>
                )}
                <LoginFormError error={error} />
                <LoginFormActions isLoading={isLoading} />
            </form>
            <TelegramLoginButton />
        </Card>
    </DynamicModuleLoader>
);

const LoginForm = memo(({ className, onSuccess }: LoginFormProps) => {
    const loginForm = useLoginForm({ onSuccess });
    const { pendingMaskedEmail, onBackToCredentials } = loginForm;

    if (pendingMaskedEmail) {
        return (
            <TwoFactorForm
                className={className}
                maskedEmail={pendingMaskedEmail}
                onSuccess={onSuccess}
                onBack={onBackToCredentials}
            />
        );
    }

    return <CredentialsView className={className} {...loginForm} />;
});

export default LoginForm;
