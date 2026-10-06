import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import s from './AddHallModal.module.scss';

interface AddHallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export const AddHallModal = memo(({ isOpen, onClose, onSaved }: AddHallModalProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [saving, setSaving] = useState(false);

    const onSubmit = async () => {
        if (!name) { toast.error('Введите название зала'); return; }
        setSaving(true);
        try {
            await $apiPrivate.post('/schedule/halls', { name, capacity: capacity || undefined });
            toast.success('Зал добавлен');
            setName(''); setCapacity('');
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось добавить зал');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2 className={s.title}>{t('ДОБАВИТЬ ЗАЛ')}</h2>
                <div className={s.field}>
                    <label className={s.label}>{t('Название зала *')}</label>
                    <input className={s.input} placeholder="White" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className={s.field}>
                    <label className={s.label}>{t('Вместимость')}</label>
                    <input className={s.input} type="number" placeholder="20" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
                <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Добавить'}
                </button>
            </div>
        </Modal>
    );
});
