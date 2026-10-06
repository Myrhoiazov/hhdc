import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import s from './ScheduleSettingsPage.module.scss';

interface ScheduleToolbarProps {
    onCreate: () => void;
}

export const ScheduleToolbar = memo(({ onCreate }: ScheduleToolbarProps) => {
    const { t } = useTranslation();
    return (
        <div className={s.toolbar}>
            <button className={s.primaryBtn} onClick={onCreate}>
                {t('+ Создать группу')}
            </button>
        </div>
    );
});
