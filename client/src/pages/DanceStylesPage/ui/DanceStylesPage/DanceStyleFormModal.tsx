import { ChangeEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Lang, langFields, StyleForm } from '../../useDanceStyles';
import s from './DanceStylesPage.module.scss';

interface DanceStyleFormModalProps {
    isOpen: boolean;
    isEditing: boolean;
    lang: Lang;
    form: StyleForm;
    saving: boolean;
    onClose: () => void;
    onLangChange: (lang: Lang) => void;
    onFieldChange: (field: keyof StyleForm, value: string | boolean) => void;
    onUploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
}

export const DanceStyleFormModal = memo((props: DanceStyleFormModalProps) => {
    const { isOpen, isEditing, lang, form, saving, onClose, onLangChange, onFieldChange, onUploadImage, onSave } = props;
    const { t } = useTranslation();
    const fields = langFields[lang];

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.form}>
                <h2>{isEditing ? 'Редактировать стиль' : 'Добавить стиль'}</h2>
                <div className={s.tabs}>{(['ua', 'ru', 'en'] as Lang[]).map((code) => <button key={code} className={lang === code ? s.activeTab : ''} onClick={() => onLangChange(code)}>{langFields[code].label}</button>)}</div>
                <label>{t('Название (')}{fields.label}) {lang === 'ru' && '*'}<input value={String(form[fields.name] ?? '')} onChange={(e) => onFieldChange(fields.name, e.target.value)} placeholder={`${fields.label}: Например Jazz Funk`} /></label>
                <label>{t('Описание (')}{fields.label})<textarea rows={3} value={String(form[fields.description] ?? '')} onChange={(e) => onFieldChange(fields.description, e.target.value)} placeholder="Краткое описание направления для карточки" /></label>
                <label>{t('Подробное описание (')}{fields.label})<textarea className={s.editor} rows={8} value={String(form[fields.content] ?? '')} onChange={(e) => onFieldChange(fields.content, e.target.value)} placeholder="Подробное описание стиля" /></label>
                <label>{t('Фото')}<input type="file" accept="image/*" onChange={onUploadImage} /></label>
                {form.image && <img className={s.preview} src={form.image} alt="" />}
                <label>{t('Ссылка на YouTube')}<input value={form.youtubeUrl} onChange={(e) => onFieldChange('youtubeUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
                <label className={s.toggleLabel}><button className={`${s.switch} ${form.isActive ? s.on : ''}`} onClick={() => onFieldChange('isActive', !form.isActive)}><span /></button>{form.isActive ? 'Включен' : 'Выключен'}</label>
                <div className={s.formActions}><button className={s.reset} onClick={onClose}>{t('Закрыть')}</button><button className={s.cta} onClick={onSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить стиль'}</button></div>
            </div>
        </Modal>
    );
});
