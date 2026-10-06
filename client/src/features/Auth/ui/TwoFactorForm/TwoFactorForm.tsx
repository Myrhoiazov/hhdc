import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Card } from '@/shared/ui/Card/Card';
import { classNames } from '@/shared/lib/classNames/classNames';
import { TwoFactorFormHeader } from './TwoFactorFormHeader';
import { TwoFactorFormFields } from './TwoFactorFormFields';
import { TwoFactorFormActions } from './TwoFactorFormActions';
import { useTwoFactorResend } from './useTwoFactorResend';
import { useTwoFactorVerify } from './useTwoFactorVerify';
import cls from './TwoFactorForm.module.scss';

const FormMessage = ({ error, success }: { error?: string; success?: string }) => {
    if (error) {
        return <div className={cls.error}>{error}</div>;
    }
    if (success) {
        return <div className={cls.success}>{success}</div>;
    }
    return null;
};

export interface TwoFactorFormProps {
    className?: string;
    maskedEmail: string;
    onSuccess?: () => void;
    onBack: () => void;
}

export const TwoFactorForm = memo(({ className, maskedEmail, onSuccess, onBack }: TwoFactorFormProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState<string>();
    const {
        code, trustDevice, setTrustDevice, isVerifying, onChangeCode, onSubmit,
    } = useTwoFactorVerify(setError, onSuccess);
    const { isResending, resendMessage, secondsLeft, onResend } = useTwoFactorResend(setError);

    return (
        <Card className={classNames(cls.TwoFactorForm, {}, [className])} padding="40">
            <form onSubmit={onSubmit}>
                <TwoFactorFormHeader maskedEmail={maskedEmail} />
                <TwoFactorFormFields code={code} onChangeCode={onChangeCode} />
                <CheckBox
                    value={trustDevice}
                    onChange={setTrustDevice}
                    label={t('Запомнить это устройство на 30 дней')}
                />
                <FormMessage error={error} success={!error ? resendMessage : undefined} />
                <TwoFactorFormActions
                    isVerifying={isVerifying}
                    codeLength={code.length}
                    isResending={isResending}
                    secondsLeft={secondsLeft}
                    onResend={onResend}
                    onBack={onBack}
                />
            </form>
        </Card>
    );
});
