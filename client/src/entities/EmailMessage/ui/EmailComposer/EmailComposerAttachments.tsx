import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { HStack } from '@/shared/ui/Stack';
import cls from './EmailComposer.module.scss';

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

interface EmailComposerAttachmentsProps {
    files: File[];
    error: string | undefined;
    onRemoveFile: (index: number) => void;
}

export const EmailComposerAttachments = memo(({ files, error, onRemoveFile }: EmailComposerAttachmentsProps) => {
    const { t } = useTranslation();

    if (files.length === 0 && !error) return null;

    return (
        <>
            {files.length > 0 && (
                <HStack gap="8" wrap="wrap">
                    {files.map((file, index) => (
                        <span key={`${file.name}-${index}`} className={cls.fileChip}>
                            <span className={cls.fileName}>{file.name}</span>
                            <span className={cls.fileSize}>{formatFileSize(file.size)}</span>
                            <button
                                type="button"
                                className={cls.fileRemove}
                                onClick={() => onRemoveFile(index)}
                                aria-label={t('Убрать файл')}
                            >
                                {t('✕')}
                            </button>
                        </span>
                    ))}
                </HStack>
            )}
            {error && <Text text={error} variant="error" size="s" />}
        </>
    );
});
