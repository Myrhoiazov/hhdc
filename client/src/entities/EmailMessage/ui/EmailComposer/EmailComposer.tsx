import { memo } from 'react';
import { EditorContent } from '@tiptap/react';
import { VStack } from '@/shared/ui/Stack';
import cls from './EmailComposer.module.scss';
import { useEmailComposer } from './useEmailComposer';
import { EmailComposerToolbar } from './EmailComposerToolbar';
import { EmailComposerAttachments } from './EmailComposerAttachments';
import { EmailComposerFooter } from './EmailComposerFooter';

export interface EmailComposerSendPayload {
    html: string;
    files: File[];
}

interface EmailComposerProps {
    onSend: (payload: EmailComposerSendPayload) => Promise<boolean>;
    isSending?: boolean;
    sendLabel?: string;
    placeholder?: string;
}

export const EmailComposer = memo((props: EmailComposerProps) => {
    const { isSending, sendLabel } = props;
    const {
        editor, files, error, fileInputRef,
        onPickFiles, onFilesSelected, onRemoveFile,
        onSetLink, isEmpty, onSubmit,
    } = useEmailComposer({ onSend: props.onSend, placeholder: props.placeholder });

    return (
        <VStack gap="8" max align="stretch" className={cls.composer}>
            <EmailComposerToolbar editor={editor} onSetLink={onSetLink} />
            <EditorContent editor={editor} className={cls.editor} />
            <EmailComposerAttachments files={files} error={error} onRemoveFile={onRemoveFile} />
            <EmailComposerFooter
                filesCount={files.length}
                fileInputRef={fileInputRef}
                onFilesSelected={onFilesSelected}
                onPickFiles={onPickFiles}
                isSending={isSending}
                isEmpty={isEmpty}
                sendLabel={sendLabel}
                onSubmit={onSubmit}
            />
        </VStack>
    );
});
