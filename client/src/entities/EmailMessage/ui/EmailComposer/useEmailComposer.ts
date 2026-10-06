import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/react';
import { useEmailAttachments } from './useEmailAttachments';
import type { EmailComposerSendPayload } from './EmailComposer';

interface UseEmailComposerParams {
    onSend: (payload: EmailComposerSendPayload) => Promise<boolean>;
    placeholder?: string;
}

export interface UseEmailComposerResult {
    editor: Editor | null;
    files: File[];
    error: string | undefined;
    setError: (value: string | undefined) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onPickFiles: () => void;
    onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onSetLink: () => void;
    isEmpty: boolean;
    onSubmit: () => Promise<void>;
}

export const useEmailComposer = ({ onSend, placeholder }: UseEmailComposerParams): UseEmailComposerResult => {
    const { files, error, setError, fileInputRef, onPickFiles, onFilesSelected, onRemoveFile, clearFiles } = useEmailAttachments();

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: placeholder ?? 'Напишите сообщение...' }),
        ],
        // Tiptap v3 no longer re-renders the host component on every transaction by
        // default (unlike v2) — without this, `editor.isEmpty` and toolbar
        // `isActive(...)` checks freeze at their mount-time value.
        shouldRerenderOnTransaction: true,
    });

    const onSetLink = () => {
        const previousUrl = editor?.getAttributes('link').href as string | undefined;
        const url = window.prompt('Ссылка (URL):', previousUrl ?? 'https://');

        if (url === null) return;

        if (!url) {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const isEmpty = !editor || editor.isEmpty;

    const onSubmit = async () => {
        if (!editor || isEmpty) return;
        setError(undefined);
        const ok = await onSend({ html: editor.getHTML(), files });
        if (ok) {
            editor.commands.clearContent();
            clearFiles();
        } else {
            setError('Не удалось отправить письмо');
        }
    };

    return { editor, files, error, setError, fileInputRef, onPickFiles, onFilesSelected, onRemoveFile, onSetLink, isEmpty, onSubmit };
};
