import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGlobalSearch } from '../../model/services/fetchGlobalSearch/fetchGlobalSearch';
import { GlobalSearchResponse } from '../../model/types/globalSearch';

const DEBOUNCE_MS = 350;
export const MIN_QUERY_LENGTH = 2;

export const useDebouncedGlobalSearch = (trimmedQuery: string) => {
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [data, setData] = useState<GlobalSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        setData(null);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (trimmedQuery.length < MIN_QUERY_LENGTH) {
            reset();
            return undefined;
        }

        setLoading(true);
        debounceRef.current = setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            fetchGlobalSearch(trimmedQuery, controller.signal)
                .then((response) => {
                    setData(response);
                })
                .catch((error) => {
                    if (controller.signal.aborted) return;
                    console.error('Global search failed:', error);
                    setData(null);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmedQuery]);

    return { data, loading, reset };
};
