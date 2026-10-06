import { memo, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { classNames } from '@/shared/lib/classNames/classNames';
import type { Editor } from '@tiptap/react';
import cls from './RichTextEditor.module.scss';

interface RichTextEditorProps {
    className?: string;
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    readonly?: boolean;
}

interface FormatAction {
    label: string;
    content: ReactNode;
    isActive: () => boolean;
    run: () => void;
}

const ToolbarButton = memo(({ active, label, onClick, children }: {
    active: boolean;
    label: string;
    onClick: () => void;
    children: ReactNode;
}) => (
    <button
        type="button"
        className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: active })}
        onClick={onClick}
        aria-label={label}
    >
        {children}
    </button>
));

const useRichTextEditor = (value: string, onChange: (html: string) => void, placeholder?: string, readonly?: boolean) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: placeholder ?? '' }),
        ],
        content: value,
        editable: !readonly,
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor: updatedEditor }) => {
            onChange(updatedEditor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!readonly);
    }, [editor, readonly]);

    return editor;
};

const getFormatActions = (editor: Editor | null, t: (key: string) => string, onSetLink: () => void): FormatAction[] => [
    { label: t('Жирный'), content: <b>B</b>, isActive: () => !!editor?.isActive('bold'), run: () => editor?.chain().focus().toggleBold().run() },
    { label: t('Курсив'), content: <i>I</i>, isActive: () => !!editor?.isActive('italic'), run: () => editor?.chain().focus().toggleItalic().run() },
    { label: t('Маркированный список'), content: <span>•≡</span>, isActive: () => !!editor?.isActive('bulletList'), run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: t('Нумерованный список'), content: <span>{t('1≡')}</span>, isActive: () => !!editor?.isActive('orderedList'), run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: t('Ссылка'), content: <span>🔗</span>, isActive: () => !!editor?.isActive('link'), run: onSetLink },
];

export const RichTextEditor = memo((props: RichTextEditorProps) => {
    const { className, value, onChange, placeholder, readonly } = props;
    const { t } = useTranslation();
    const editor = useRichTextEditor(value, onChange, placeholder, readonly);

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

const formatActions = getFormatActions(editor, t, onSetLink);

    return (
        <div className={classNames(cls.wrapper, {}, [className])}>
            <div className={cls.toolbar}>
                {formatActions.map((action) => (
                    <ToolbarButton
                        key={action.label}
                        active={action.isActive()}
                        label={action.label}
                        onClick={action.run}
                    >
                        {action.content}
                    </ToolbarButton>
                ))}
            </div>
            <EditorContent editor={editor} className={cls.editor} />
        </div>
    );
});