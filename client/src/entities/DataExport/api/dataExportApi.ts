import { postData } from '@/shared/api/request';

export const createExport = async (entity: string) =>
    postData<{ filename: string; csv: string; rows: number }>('/exports', { entity });
