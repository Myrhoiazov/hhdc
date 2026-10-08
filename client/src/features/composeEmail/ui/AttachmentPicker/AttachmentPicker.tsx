import { ChangeEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addAttachments, formatFileSize } from '../../model/attachments';
import cls from './AttachmentPicker.module.scss';

interface AttachmentPickerProps {
    files: File[];
    disabled?: boolean;
    onChange: (files: File[]) => void;
}

export const AttachmentPicker = memo(({ files, disabled, onChange }: AttachmentPickerProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const onPick = (event: ChangeEvent<HTMLInputElement>) => {
        const selection = addAttachments(files, Array.from(event.target.files ?? []));
        // Cleared so the same file can be picked again after it was removed.
        event.target.value = '';
        setError(selection.error);
        onChange(selection.files);
    };
    return <div className={cls.AttachmentPicker}>
        <label className={cls.attachButton}>
            <input className={cls.srOnly} type="file" multiple disabled={disabled} onChange={onPick} />
            {t('Attach file')}
        </label>
        {error && <span role="alert" className={cls.attachmentError}>{t(error)}</span>}
        {files.length > 0 && <ul className={cls.attachmentList} aria-label={t('Attachments')}>
            {files.map((file) => <li key={`${file.name}:${file.size}`}>
                <span>{file.name}</span><small>{formatFileSize(file.size)}</small>
                <button type="button" disabled={disabled} aria-label={`${t('Remove')} ${file.name}`}
                    onClick={() => onChange(files.filter((kept) => kept !== file))}>×</button>
            </li>)}
        </ul>}
    </div>;
});
