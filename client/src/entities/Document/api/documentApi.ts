import { $apiPrivate } from '@/shared/api/api';
import { patchData, postData, readData } from '@/shared/api/request';
import { FileDocument, DocumentUploadInput } from '../model/types';

export const listChoreographerDocuments = async (personId: string) =>
    readData<FileDocument[]>(`/choreographers/${personId}/documents`);

export const listEventDocuments = async (eventId: string) =>
    readData<FileDocument[]>(`/documents/by-event/${eventId}`);

const fileForm = (file: File, fields: Record<string, string | undefined> = {}) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(fields).forEach(([name, value]) => {
        if (value) form.append(name, value);
    });
    return form;
};

export const uploadChoreographerDocument = async (
    personId: string,
    file: File,
    input: DocumentUploadInput
) => postData<FileDocument>(`/choreographers/${personId}/documents`, fileForm(file, { ...input }));

// Replacing a file adds a version; earlier versions stay available.
export const uploadDocumentVersion = async (documentId: string, file: File) =>
    postData<FileDocument>(`/documents/${documentId}/versions`, fileForm(file));

export const updateDocumentMetadata = async (
    documentId: string,
    input: { contractStatus?: string; invoiceStatus?: string; archived?: boolean }
) => patchData<FileDocument>(`/documents/${documentId}/metadata`, input);

// Documents are private: the file is fetched with the staff session, never linked by a public URL.
export const fetchDocumentFile = async (documentId: string, version?: number): Promise<Blob> =>
    (
        await $apiPrivate.get<Blob>(
            `/documents/${documentId}/download${version ? `?version=${version}` : ''}`,
            { responseType: 'blob' }
        )
    ).data;
