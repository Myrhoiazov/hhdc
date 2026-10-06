import type { DanceGroup } from '@/entities/DanceGroup';
import { useGroupFormReferenceData } from './useGroupFormReferenceData';
import { useGroupFormState } from './useGroupFormState';
import { useGroupFormSubmit } from './useGroupFormSubmit';

export { emptySlot } from './groupFormSlots';

export const useCreateGroupForm = (
    isOpen: boolean,
    editGroup: DanceGroup | null | undefined,
    onSaved: () => void,
    onClose: () => void,
) => {
    const referenceData = useGroupFormReferenceData(isOpen);
    const form = useGroupFormState(isOpen, editGroup);
    const { saving, onSubmit } = useGroupFormSubmit(form, editGroup, onSaved, onClose);

    return {
        ...form,
        ...referenceData,
        saving,
        onSubmit,
    };
};
