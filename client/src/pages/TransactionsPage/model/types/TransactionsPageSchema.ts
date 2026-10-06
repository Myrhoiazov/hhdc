import { EntityState } from "@reduxjs/toolkit";
import { Month } from "@/entities/Month";
import { Summary } from "@/entities/Summary";
import { Transaction, TransactionSortField } from "@/entities/Transaction";
import { TransactionType } from "@/entities/TransactionType";
import { SortOrder } from "@/shared/types/sort";

export interface TransactionsPageSchema extends EntityState<Transaction, string> {
    isLoading?: boolean;
    error?: string;
    items?: Transaction[];
    summary?: Summary

    // for pagination
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;

    //filters
    sort: TransactionSortField
    order: SortOrder
    search: string;
    type: TransactionType;
    month?: Month;

    _inited: boolean
}