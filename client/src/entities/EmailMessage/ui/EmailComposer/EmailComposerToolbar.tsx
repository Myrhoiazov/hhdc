import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './EmailComposer.module.scss';

interface EmailComposerToolbarProps {
    editor: Editor | null;
    onSetLink: () => void;
}

export const EmailComposerToolbar = memo(({ editor, onSetLink }: EmailComposerToolbarProps) => {
    const { t } = useTranslation();

    return (
        <div className={cls.toolbar}>
            <button
                type="button"
                className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('bold') })}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                aria-label={t('Жирный')}
            >
                <b>B</b>
            </button>
            <button
                type="button"
                className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('italic') })}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                aria-label={t('Курсив')}
            >
                <i>I</i>
            </button>
            <button
                type="button"
                className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('bulletList') })}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                aria-label={t('Маркированный список')}
            >
                •≡
            </button>
            <button
                type="button"
                className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('orderedList') })}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                aria-label={t('Нумерованный список')}
            >
                {t('1≡')}
            </button>
            <button
                type="button"
                className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('link') })}
                onClick={onSetLink}
                aria-label={t('Ссылка')}
            >
                🔗
            </button>
        </div>
    );
});
