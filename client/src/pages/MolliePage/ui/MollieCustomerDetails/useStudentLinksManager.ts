import { useStudentLinksData } from './useStudentLinksData';
import { useStudentLinkActions } from './useStudentLinkActions';

export type { PayerRelation } from './studentLinksHelpers';
export { getStudentName } from './studentLinksHelpers';

export const useStudentLinksManager = (customerId: string, version: number, onChanged: () => void) => {
    const {
        clientLinks, setClientLinks, isLoading, error, availableClientOptions,
    } = useStudentLinksData(customerId, version);

    const {
        selectedClientId, setSelectedClientId, payerRelation, setPayerRelation, isSaving, onAddStudent, onDeleteLink,
    } = useStudentLinkActions(customerId, clientLinks, setClientLinks, onChanged);

    return {
        clientLinks,
        selectedClientId,
        setSelectedClientId,
        payerRelation,
        setPayerRelation,
        isLoading,
        isSaving,
        error,
        availableClientOptions,
        onAddStudent,
        onDeleteLink,
    };
};
