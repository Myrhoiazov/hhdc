import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchTransactionsList } from '../../model/services/fetchTransactionsList/fetchTransactionsList';
import { fetchTransactionsSummary } from '../../model/services/fetchTransactionsSummary/fetchTransactionsSummary';
import { initTransactionsPage } from '../../model/services/initTransactionsPage/initTransactionsPage';
import { transactionsPageActions } from '../../model/slices/transactionsPageSlice';
import {
    getTransactionPageData,
    getTransactionPageIsLoading,
    getTransactionPagePage,
    getTransactionPageTotal,
    getTransactionPageTotalPages,
} from '../../model/selectors/transactionPageSelectors';
import { getTransactionPageSummaryData } from '../../model/selectors/getTransactionPageSummary';

export const useTransactionsPage = () => {
    const dispatch = useAppDispatch();
    const transactions = useSelector(getTransactionPageData);
    const summary = useSelector(getTransactionPageSummaryData);
    const isLoading = useSelector(getTransactionPageIsLoading);
    const page = useSelector(getTransactionPagePage);
    const total = useSelector(getTransactionPageTotal);
    const totalPages = useSelector(getTransactionPageTotalPages);
    const [searchParams] = useSearchParams();

    useInitialEffect(() => {
        dispatch(initTransactionsPage(searchParams));
    });

    const fetchAllTransactions = useCallback(() => {
        dispatch(fetchTransactionsList({ replace: true, noQuery: true }));
        dispatch(fetchTransactionsSummary());
    }, [dispatch]);

    const onPreviousPage = useCallback(() => {
        dispatch(transactionsPageActions.setPage(Math.max(page - 1, 1)));
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch, page]);

    const onNextPage = useCallback(() => {
        dispatch(transactionsPageActions.setPage(Math.min(page + 1, totalPages)));
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch, page, totalPages]);

    return {
        transactions, summary, isLoading, page, total, totalPages,
        fetchAllTransactions, onPreviousPage, onNextPage,
    };
};
