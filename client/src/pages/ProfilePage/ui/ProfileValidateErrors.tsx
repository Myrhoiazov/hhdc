import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { ValidateProfileError } from '@/entities/Profile';

interface ProfileValidateErrorsProps {
    validateErrors?: ValidateProfileError[];
}

export const ProfileValidateErrors = ({ validateErrors }: ProfileValidateErrorsProps) => {
    const { t } = useTranslation('profile');

    if (!validateErrors?.length) {
        return null;
    }

    const translate: Record<string, string> = {
        [ValidateProfileError.INCORRECT_USER_DATA]: t('incorrect_user_data'),
        [ValidateProfileError.INCORRECT_AGE]: t('incorrect_age'),
        [ValidateProfileError.INCORRECT_COUNTRY]: t('incorrect_country'),
        [ValidateProfileError.INCORRECT_CITY]: t('incorrect_city'),
        [ValidateProfileError.INCORRECT_USERNAME]: t('incorrect_username'),
        [ValidateProfileError.NO_DATA]: t('incorrect_data'),
        [ValidateProfileError.SERVER_ERROR]: t('server_error'),
        [ValidateProfileError.EMAIL_ALREADY_EXISTS]: t('email_already_exists'),
        INCORRECT_EMAIL: t('incorrect_email'),
        INCORRECT_PASSWORD: t('incorrect_password'),
    };

    return (
        <>
            {validateErrors.map((error) => (
                <Text key={error} text={translate[error]} variant={'error'} />
            ))}
        </>
    );
};
