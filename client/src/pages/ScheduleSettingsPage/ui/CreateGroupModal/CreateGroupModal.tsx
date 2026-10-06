import { memo } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import type { DanceGroup } from '@/entities/DanceGroup';
import { useCreateGroupForm } from './useCreateGroupForm';
import { CreateGroupModalFields } from './CreateGroupModalFields';
import { CreateGroupModalSlots } from './CreateGroupModalSlots';
import s from './CreateGroupModal.module.scss';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editGroup?: DanceGroup | null;
}

export const CreateGroupModal = memo(
    ({ isOpen, onClose, onSaved, editGroup }: CreateGroupModalProps) => {
        const f = useCreateGroupForm(isOpen, editGroup, onSaved, onClose);
        const label = editGroup ? 'РЕДАКТИРОВАТЬ ГРУППУ' : 'СОЗДАТЬ ГРУППУ';
        const submitLabel = f.saving ? 'Сохранение...' : editGroup ? 'Сохранить' : 'Создать';

        return (
            <Modal isOpen={isOpen} onClose={onClose} lazy>
                <div className={s.modal}>
                    <h2 className={s.title}>{label}</h2>
                    <div className={s.form}>
                        <CreateGroupModalFields
                            name={f.name}
                            setName={f.setName}
                            choreographerId={f.choreographerId}
                            setChoreographerId={f.setChoreographerId}
                            choreographers={f.choreographers}
                            style={f.style}
                            setStyle={f.setStyle}
                            styles={f.styles}
                            branchId={f.branchId}
                            setBranchId={f.setBranchId}
                            branches={f.branches}
                            level={f.level}
                            setLevel={f.setLevel}
                            maxParticipants={f.maxParticipants}
                            setMaxParticipants={f.setMaxParticipants}
                            lessonPrice={f.lessonPrice}
                            setLessonPrice={f.setLessonPrice}
                        />
                        <CreateGroupModalSlots
                            slots={f.slots}
                            onAddSlot={f.addSlot}
                            onUpdateSlot={f.updateSlot}
                            onRemoveSlot={f.removeSlot}
                        />
                    </div>
                    <button className={s.submitBtn} onClick={f.onSubmit} disabled={f.saving}>
                        {submitLabel}
                    </button>
                </div>
            </Modal>
        );
    }
);
