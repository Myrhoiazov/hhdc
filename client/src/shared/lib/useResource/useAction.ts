import { useCallback, useState } from 'react';
import { messageOf } from './messageOf';

// Runs a mutation with shared busy/error state; resolves to true when it succeeded.
export const useAction = (onDone?: () => void) => {
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const run = useCallback(async (action: () => Promise<unknown>) => {
        setBusy(true);
        setError('');
        try { await action(); onDone?.(); return true; }
        catch (cause) { setError(messageOf(cause)); return false; }
        finally { setBusy(false); }
    }, [onDone]);
    return { error, busy, run };
};
