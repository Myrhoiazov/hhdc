import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { extractApiErrorMessage } from './knowledgeBaseTypes';
import { SimulationProvider } from './emailSimulationTypes';
import { SimulationRunDetail, SimulationRunSummary } from './simulationHistoryTypes';

const PAGE_SIZE = 20;

interface SimulationRunsResponse {
    items: SimulationRunSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const fetchSimulationRunsPage = async (
    page: number,
    limit: number,
    provider: '' | SimulationProvider,
): Promise<SimulationRunsResponse> => {
    const response = await $apiPrivate.get<SimulationRunsResponse>('/ai-email/simulation-runs', {
        params: { _page: page, _limit: limit, provider: provider || undefined },
    });
    return response.data;
};

const fetchSimulationRunDetail = async (id: number): Promise<SimulationRunDetail> => {
    const response = await $apiPrivate.get<SimulationRunDetail>(`/ai-email/simulation-runs/${id}`);
    return response.data;
};

export const useSimulationHistory = () => {
    const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [providerFilter, setProviderFilterState] = useState<'' | SimulationProvider>('');
    const [selectedRun, setSelectedRun] = useState<SimulationRunDetail | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchSimulationRunsPage(page, PAGE_SIZE, providerFilter);
            setRuns(data.items ?? []);
            setTotal(data.total ?? 0);
            setTotalPages(data.totalPages ?? 1);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось загрузить историю симуляций'));
        } finally {
            setLoading(false);
        }
    }, [page, providerFilter]);

    useEffect(() => { load(); }, [load]);

    const setProviderFilter = (value: '' | SimulationProvider) => {
        setProviderFilterState(value);
        setPage(1);
    };

    const openRun = async (id: number) => {
        try {
            setSelectedRun(await fetchSimulationRunDetail(id));
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'Не удалось загрузить запуск симуляции'));
        }
    };
    const closeRun = () => setSelectedRun(null);

    // Called after a fresh simulation run persists — jumps back to page 1 so the just-run
    // simulation is visible without a manual reload. setPage(1) alone would no-op via the load()
    // effect when already on page 1, so that case calls load() directly instead.
    const refresh = useCallback(() => {
        if (page !== 1) setPage(1);
        else load();
    }, [page, load]);

    return { runs, loading, page, setPage, total, totalPages, providerFilter, setProviderFilter, selectedRun, openRun, closeRun, refresh };
};
