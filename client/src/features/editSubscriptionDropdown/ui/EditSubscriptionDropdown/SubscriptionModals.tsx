import { Dispatch, SetStateAction, memo } from 'react';
import { SelectOption } from '@/shared/ui/Select/Select';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { RestartSubscriptionModal } from './RestartSubscriptionModal';
import { SubscriptionFormState } from './useEditSubscriptionDropdown';
import { ModalKind } from './useSubscriptionModal';

interface SubscriptionModalsProps {
    modal: ModalKind | undefined;
    isSaving: boolean;
    form: SubscriptionFormState;
    setForm: Dispatch<SetStateAction<SubscriptionFormState>>;
    validMandateOptions: SelectOption<string>[];
    today: string;
    restartDate: string;
    setRestartDate: Dispatch<SetStateAction<string>>;
    closeModal: () => void;
    onCancel: () => void;
    onUpdate: () => void;
    onRestart: () => void;
}

export const SubscriptionModals = memo((props: SubscriptionModalsProps) => {
    const {
        modal, isSaving, form, setForm, validMandateOptions, today,
        restartDate, setRestartDate, closeModal, onCancel, onUpdate, onRestart,
    } = props;

    return (
        <>
            <CancelSubscriptionModal isOpen={modal === 'cancel'} isSaving={isSaving} onClose={closeModal} onCancel={onCancel} />
            <EditSubscriptionModal
                isOpen={modal === 'edit'}
                isSaving={isSaving}
                form={form}
                setForm={setForm}
                validMandateOptions={validMandateOptions}
                today={today}
                onClose={closeModal}
                onUpdate={onUpdate}
            />
            <RestartSubscriptionModal
                isOpen={modal === 'restart'}
                isSaving={isSaving}
                mandateId={form.mandateId}
                onMandateChange={(mandateId) => setForm((prev) => ({ ...prev, mandateId }))}
                validMandateOptions={validMandateOptions}
                restartDate={restartDate}
                setRestartDate={setRestartDate}
                today={today}
                onClose={closeModal}
                onRestart={onRestart}
            />
        </>
    );
});
