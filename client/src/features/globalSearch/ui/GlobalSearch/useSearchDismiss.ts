import { RefObject, useEffect } from 'react';

export const useSearchDismiss = (
    containerRef: RefObject<HTMLDivElement | null>,
    isExpanded: boolean,
    onDismiss: () => void,
) => {
    useEffect(() => {
        if (!isExpanded) return undefined;

        const onMouseDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onDismiss();
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [isExpanded, onDismiss, containerRef]);
};
