import { RefObject, useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
    callback?: () => void;
    triggerRef: RefObject<HTMLElement>;
    wrapperRef: RefObject<HTMLElement>;
}

export function useInfiniteScroll({ callback, wrapperRef, triggerRef }: UseInfiniteScrollOptions) {
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const wrapperElement = wrapperRef.current;
        const triggerElement = triggerRef.current;

        // if (!wrapperElement || !triggerElement || !callback) return;

        if (callback) {
            const options = {
                root: wrapperElement,
                rootMargin: '0px',
                threshold: 1.0,
            };

            observer.current = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    callback();
                }
            }, options);

            observer.current.observe(triggerElement);
        }

        return () => {
            if (observer.current && triggerElement) {

                observer.current.unobserve(triggerElement);
            }
        };
    }, [callback, triggerRef, wrapperRef]);
}
