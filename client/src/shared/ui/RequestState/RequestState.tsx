import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import cls from './RequestState.module.scss';

interface RequestStateProps {
    error: string;
    loading: boolean;
}

// What a block shows while its data is on the way or could not be read.
export const RequestState = memo(({ error, loading }: RequestStateProps) => {
    const { t } = useTranslation();
    return (
        <>
            {loading && <p role="status">{t('Loading')}</p>}
            {error && (
                <p role="alert" className={cls.error}>
                    {error}
                </p>
            )}
        </>
    );
});
