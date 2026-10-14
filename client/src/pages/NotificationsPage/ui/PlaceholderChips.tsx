import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting } from '@/entities/Notification';
import own from './NotificationTemplate.module.scss';

interface ChipsProps {
    placeholders: NotificationSetting['placeholders'];
    onInsert: (name: string) => void;
}

export const PlaceholderChips = memo(({ placeholders, onInsert }: ChipsProps) => {
    const { t } = useTranslation();
    return (
        <div className={own.chips} role="group" aria-label={t('Values for the text')}>
            <span className={own.meta}>{t('Values for the text')}:</span>
            {placeholders.map((placeholder) => (
                <button
                    type="button"
                    key={placeholder.name}
                    className={own.chip}
                    title={t(`Placeholder: ${placeholder.name}`, {
                        defaultValue: placeholder.name,
                    })}
                    onClick={() => onInsert(placeholder.name)}
                >{`{{${placeholder.name}}}`}</button>
            ))}
        </div>
    );
});
