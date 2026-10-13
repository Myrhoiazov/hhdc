import { postData, readData, readPage } from '@/shared/api/request';
import {
    Refund,
    LedgerEntry,
    LedgerSummary,
    LedgerFilters,
    LEDGER_PAGE_SIZE,
} from '../model/types';

export const listRefunds = async () => readPage<Refund>('/refunds');

export const requestRefund = async (input: { paymentId: string; amount: string; reason: string }) =>
    postData<Refund>('/refunds', input);

export const actOnRefund = async (id: string, action: 'approve' | 'reject' | 'process' | 'sync') =>
    postData<Refund>(`/refunds/${id}/${action}`);

export const listLedgerPage = async (filters: LedgerFilters, pageNumber: number) =>
    readPage<LedgerEntry>(
        `/finance/ledger?${new URLSearchParams({ ...filters, page: String(pageNumber), pageSize: String(LEDGER_PAGE_SIZE) }).toString()}`
    );

export const getLedgerSummary = async (filters: LedgerFilters) =>
    readData<LedgerSummary>(
        `/finance/ledger/summary?${new URLSearchParams({ ...filters }).toString()}`
    );
