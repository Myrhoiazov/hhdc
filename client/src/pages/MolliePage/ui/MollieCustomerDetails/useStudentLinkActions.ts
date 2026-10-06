import { Dispatch, SetStateAction, useState } from 'react';
import { MollieClientStudentLink } from '@/entities/MollieClient';
import { PayerRelation } from './studentLinksHelpers';
import { useAddStudentLink } from './useAddStudentLink';
import { useDeleteStudentLink } from './useDeleteStudentLink';

export const useStudentLinkActions = (
    customerId: string,
    clientLinks: MollieClientStudentLink[],
    setClientLinks: Dispatch<SetStateAction<MollieClientStudentLink[]>>,
    onChanged: () => void,
) => {
    const [selectedClientId, setSelectedClientId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [isSaving, setIsSaving] = useState(false);

    const addStudentLink = useAddStudentLink(customerId, clientLinks, setClientLinks, setIsSaving, onChanged);
    const onDeleteLink = useDeleteStudentLink(customerId, setClientLinks, setIsSaving, onChanged);

    const onAddStudent = () => addStudentLink(selectedClientId, payerRelation, () => setSelectedClientId(''));

    return {
        selectedClientId, setSelectedClientId, payerRelation, setPayerRelation, isSaving, onAddStudent, onDeleteLink,
    };
};
