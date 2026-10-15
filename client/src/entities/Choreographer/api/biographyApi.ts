import { postData, readData } from '@/shared/api/request';
import { BioKind, BioVersion } from '../model/biography';

export const listBioVersions = async (personId: string) =>
    readData<BioVersion[]>(`/choreographers/${personId}/biographies`);

// Versions are immutable: saving adds the next version of that language and kind.
export const addBioVersion = async (
    personId: string,
    input: { locale: string; kind: BioKind; content: string }
) => postData<BioVersion>(`/choreographers/${personId}/biographies`, input);
