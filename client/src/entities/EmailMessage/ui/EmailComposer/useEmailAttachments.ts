import { useRef, useState } from 'react';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export interface UseEmailAttachmentsResult {
    files: File[];
    error: string | undefined;
    setError: (value: string | undefined) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onPickFiles: () => void;
    onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    clearFiles: () => void;
}

export const useEmailAttachments = (): UseEmailAttachmentsResult => {
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onPickFiles = () => {
        fileInputRef.current?.click();
    };

    const onFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.target.files ?? []);
        event.target.value = '';
        setError(undefined);

        const oversized = selected.find((file) => file.size > MAX_ATTACHMENT_SIZE);
        if (oversized) {
            setError(`Файл "${oversized.name}" больше 10 МБ`);
            return;
        }

        setFiles((prev) => {
            const next = [...prev, ...selected];
            if (next.length > MAX_ATTACHMENTS) {
                setError(`Можно приложить не более ${MAX_ATTACHMENTS} файлов`);
                return prev;
            }
            return next;
        });
    };

    const onRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const clearFiles = () => {
        setFiles([]);
        setError(undefined);
    };

    return { files, error, setError, fileInputRef, onPickFiles, onFilesSelected, onRemoveFile, clearFiles };
};

export { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS };
