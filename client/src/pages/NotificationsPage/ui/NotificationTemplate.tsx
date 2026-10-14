import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationSetting } from '@/entities/Notification';
import own from './NotificationTemplate.module.scss';
import { PlaceholderChips } from './PlaceholderChips';
import { TemplateButtons } from './TemplateButtons';
import { previewMessage, insertAt } from '../model/template';
import { useTemplateActions } from '../model/useTemplateActions';

// The text of one notification: written with {{placeholders}}, previewed with example values.
export const NotificationTemplate = memo(
    ({
        setting,
        title,
        onSaved,
    }: {
        setting: NotificationSetting;
        title: string;
        onSaved: () => void;
    }) => {
        const { t } = useTranslation();
        const actions = useTemplateActions(setting, onSaved);
        const field = useRef<HTMLTextAreaElement>(null);
        const insert = (name: string) => {
            actions.setDraft(insertAt(actions.draft, field.current, name));
            field.current?.focus();
        };
        return (
            <div className={own.editor}>
                <label className={own.editorField}>
                    <span className={own.meta}>{t('Message text')}</span>
                    <textarea
                        ref={field}
                        className={own.template}
                        rows={4}
                        maxLength={2000}
                        aria-label={t('Message text: {{title}}', { title })}
                        value={actions.draft}
                        onChange={(event) => actions.setDraft(event.target.value)}
                    />
                </label>
                <div className={own.editorField}>
                    <span className={own.meta}>{t('How it will look')}</span>
                    <pre className={own.preview}>
                        {previewMessage(actions.draft, setting.placeholders) ||
                            t('The message is empty and will not be sent')}
                    </pre>
                </div>
                <PlaceholderChips placeholders={setting.placeholders} onInsert={insert} />
                <TemplateButtons setting={setting} actions={actions} />
            </div>
        );
    }
);
