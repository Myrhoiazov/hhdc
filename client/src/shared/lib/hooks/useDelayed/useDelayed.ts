import { useEffect, useState } from 'react';

export const SEARCH_DELAY_MS = 300;

// The list is asked for again only when typing pauses, not on every key.
export const useDelayed = (value: string, delayMs = SEARCH_DELAY_MS) => {
    const [delayed, setDelayed] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDelayed(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return delayed;
};
