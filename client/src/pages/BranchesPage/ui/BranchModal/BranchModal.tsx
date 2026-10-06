import { memo } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Branch } from '../BranchCard/BranchCard';
import s from './BranchModal.module.scss';
import { BranchFormFields } from './BranchFormFields';
import { useBranchModal } from './useBranchModal';

interface BranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editBranch?: Branch | null;
}

export const BranchModal = memo(({ isOpen, onClose, onSaved, editBranch }: BranchModalProps) => {
    const { form, saving, updateField, onSubmit } = useBranchModal({ isOpen, onClose, onSaved, editBranch });

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2 className={s.title}>{editBranch ? 'РЕДАКТИРОВАТЬ ФИЛИАЛ' : 'СОЗДАТЬ ФИЛИАЛ'}</h2>

                <BranchFormFields form={form} updateField={updateField} />

                <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                    {saving ? 'Сохранение...' : (editBranch ? 'Сохранить' : 'Создать')}
                </button>
            </div>
        </Modal>
    );
});
