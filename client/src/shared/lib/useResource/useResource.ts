import { useCallback, useEffect, useState } from 'react';

export const useResource = <T,>(load: () => Promise<T>) => {
    const [data, setData] = useState<T>();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');
        try { setData(await load()); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
        finally { setLoading(false); }
    }, [load]);
    useEffect(() => { void refresh(); }, [refresh]);
    return { data, error, loading, refresh };
};
