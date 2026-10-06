import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Invoice, InvoicesResponse } from '../../model/types';

const PAGE_SIZE = 15;

export const useInvoicesList = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('ALL');
    const [query, setQuery] = useState('');
    const [appliedQuery, setAppliedQuery] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<InvoicesResponse>('/invoices', {
                params: {
                    status,
                    _q: appliedQuery || undefined,
                    _page: page,
                    _limit: PAGE_SIZE,
                },
            });
            setInvoices(response.data.items);
            setTotal(response.data.total);
            setPage(response.data.page);
            setTotalPages(response.data.totalPages);
        } catch {
            toast.error('Не удалось загрузить инвойсы');
        } finally {
            setLoading(false);
        }
    }, [appliedQuery, page, status]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const applySearch = () => {
        setPage(1);
        setAppliedQuery(query.trim());
    };

    const resetSearch = () => {
        setQuery('');
        setAppliedQuery('');
        setPage(1);
    };

    return {
        invoices, loading, status, setStatus, query, setQuery, appliedQuery,
        page, setPage, total, totalPages, fetchInvoices, applySearch, resetSearch,
    };
};
