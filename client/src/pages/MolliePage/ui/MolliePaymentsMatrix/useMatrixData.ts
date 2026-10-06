import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MatrixMonth, MatrixRow } from './matrixTypes';

export interface PaymentsMatrixResponse {
    startYear: number;
    endYear: number;
    months: MatrixMonth[];
    rows: MatrixRow[];
}

export const useMatrixData = (startYear: string) => {
    const [data, setData] = useState<PaymentsMatrixResponse>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    const loadMatrix = useCallback(async () => {
        setIsLoading(true);
        setError(false);
        try {
            const response = await $apiPrivate.get<PaymentsMatrixResponse>('/mollie/payments/matrix', {
                params: { startYear },
            });
            setData(response.data);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [startYear]);

    useEffect(() => {
        loadMatrix();
    }, [loadMatrix]);

    return {
        data, isLoading, error, loadMatrix,
    };
};
