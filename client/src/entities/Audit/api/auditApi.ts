import { readData, readPage } from '@/shared/api/request';
import { LIST_PAGE_SIZE } from '@/shared/const/pagination';
import { AuditEntry, AuditFilters, AuditOptions } from '../model/types';

export const listAuditPage = async (filters: AuditFilters, page: number) =>
    readPage<AuditEntry>(
        `/audit?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(LIST_PAGE_SIZE) }).toString()}`
    );

export const getAuditOptions = async () => readData<AuditOptions>('/audit/options');
