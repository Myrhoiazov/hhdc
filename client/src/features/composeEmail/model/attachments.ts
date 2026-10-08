export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface AttachmentSelection {
    files: File[];
    // Translation key of the reason some files were left out, or an empty string.
    error: string;
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size;

// Adds newly picked files to the letter, leaving out duplicates, oversized files and the overflow.
export const addAttachments = (current: File[], picked: File[]): AttachmentSelection => {
    const fitting = picked.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);
    const fresh = fitting.filter((file, index) => !current.some((kept) => sameFile(kept, file))
        && fitting.findIndex((other) => sameFile(other, file)) === index);
    const files = [...current, ...fresh].slice(0, MAX_ATTACHMENTS);
    if (fitting.length < picked.length) return { files, error: 'A file larger than 10 MB cannot be attached' };
    return { files, error: current.length + fresh.length > MAX_ATTACHMENTS ? 'No more than 5 files can be attached' : '' };
};

export const formatFileSize = (bytes: number): string => (bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
