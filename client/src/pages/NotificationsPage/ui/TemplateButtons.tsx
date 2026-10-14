import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting } from '@/entities/Notification';
import { Button } from '@/shared/ui/Button';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './NotificationTemplate.module.scss';
import { TemplateActions } from '../model/useTemplateActions';

export const TemplateButtons = memo(
    ({ setting, actions }: { setting: NotificationSetting; actions: TemplateActions }) => {
        const { t } = useTranslation();
        const { busy, changed, notice } = actions;
        return (
            <>
                <div className={cls.actions}>
                    <Button disabled={busy || !changed} onClick={() => void actions.save()}>
                        {t('Save text')}
                    </Button>
                    <Button
                        disabled={busy || (!setting.customised && !changed)}
                        onClick={() => void actions.reset()}
                    >
                        {t('Return the first text')}
                    </Button>
                    <Button
                        disabled={busy || changed || !setting.configured}
                        onClick={() => void actions.test()}
                    >
                        {t('Send a test message')}
                    </Button>
                </div>
                {notice && (
                    <span
                        role={notice.tone === 'error' ? 'alert' : 'status'}
                        className={notice.tone === 'error' ? cls.error : own.meta}
                    >
                        {notice.text}
                    </span>
                )}
            </>
        );
    }
);
