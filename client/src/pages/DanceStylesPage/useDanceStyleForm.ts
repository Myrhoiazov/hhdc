import { useState } from 'react';
import {
    DanceStyle, Lang, StyleForm, emptyForm,
} from './danceStyleTypes';
import { useDanceStyleFormSubmit } from './useDanceStyleFormSubmit';

export const useDanceStyleForm = (loadStyles: () => Promise<void>) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number>();
    const [lang, setLang] = useState<Lang>('ru');
    const [form, setForm] = useState<StyleForm>(emptyForm);

    const openCreate = () => {
        setEditingId(undefined);
        setForm(emptyForm);
        setLang('ru');
        setModalOpen(true);
    };

    const openEdit = (item: DanceStyle) => {
        setEditingId(item.id);
        setForm({ ...emptyForm, ...item });
        setLang('ru');
        setModalOpen(true);
    };

    const updateField = (field: keyof StyleForm, value: string | boolean) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const { saving, uploadImage, save } = useDanceStyleFormSubmit(form, updateField, editingId, setModalOpen, loadStyles);

    return {
        modalOpen, setModalOpen, editingId, lang, setLang, form, saving,
        openCreate, openEdit, updateField, uploadImage, save,
    };
};
