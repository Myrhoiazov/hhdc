import { Dispatch, KeyboardEvent, useCallback } from 'react';
import type { FlatResult } from './globalSearchResults';

export const useSearchKeyboard = (
    flatResults: FlatResult[],
    activeIndex: number,
    setActiveIndex: Dispatch<React.SetStateAction<number>>,
    onNavigate: (route: string) => void,
    onClose: () => void,
) => useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
        onClose();
        return;
    }

    if (!flatResults.length) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = flatResults[activeIndex >= 0 ? activeIndex : 0];
        if (target) onNavigate(target.route);
    }
}, [flatResults, activeIndex, setActiveIndex, onNavigate, onClose]);
