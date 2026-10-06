import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack } from '@/shared/ui/Stack';
import { MAX_ATTACHMENTS } from './useEmailAttachments';
import cls from './EmailComposer.module.scss';

interface EmailComposerFooterProps {
    filesCount: number;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onPickFiles: () => void;
    isSending?: boolean;
    isEmpty: boolean;
    sendLabel?: string;
    onSubmit: () => void;
}

export const EmailComposerFooter = memo(({
    filesCount, fileInputRef, onFilesSelected, onPickFiles,
    isSending, isEmpty, sendLabel, onSubmit,
}: EmailComposerFooterProps) => {
    const { t } = useTranslation();

    return (
        <HStack justify="between" align="center" max>
            <div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className={cls.hiddenInput}
                    onChange={onFilesSelected}
                />
                <Button
                    theme={ButtonTheme.OUTLINE}
                    onClick={onPickFiles}
                    disabled={filesCount >= MAX_ATTACHMENTS}
                >
                    📎 {t('Прикрепить файл')}
                </Button>
            </div>
            <Button
                theme={ButtonTheme.BACKGROUND_INVERTED}
                disabled={isSending || isEmpty}
                onClick={onSubmit}
            >
                {isSending ? t('Отправка...') : (sendLabel ?? t('Отправить'))}
            </Button>
        </HStack>
    );
});
