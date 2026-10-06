import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import cls from './TwoFactorForm.module.scss';

interface TwoFactorFormFieldsProps {
    code: string;
    onChangeCode: (value: string) => void;
}

export const TwoFactorFormFields = ({ code, onChangeCode }: TwoFactorFormFieldsProps) => {
    const { t } = useTranslation();

    return (
        <div className={cls.fields}>
            <Input
                fullWidth
                label={t('Код из письма')}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autofocus
                className={cls.input}
                placeholder="000000"
                value={code}
                onChange={onChangeCode}
            />
        </div>
    );
};
