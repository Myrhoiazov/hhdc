import { useCallback, useEffect, useState } from 'react';
import { messageOf } from './messageOf';

export const useResource = <T>(load: () => Promise<T>) => {
    const [data, setData] = useState<T>();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await load());
        } catch (cause) {
            setError(messageOf(cause));
        } finally {
            setLoading(false);
        }
    }, [load]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    return { data, error, loading, refresh };
};
