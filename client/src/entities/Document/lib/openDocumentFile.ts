import { fetchDocumentFile } from '../api/documentApi';

// Documents are private: the file is fetched with the staff session and opened from memory in a
// new tab; the address is released a minute later, when the tab has read it.
export const openDocumentFile = async (documentId: string, version?: number): Promise<void> => {
    const url = URL.createObjectURL(await fetchDocumentFile(documentId, version));
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
