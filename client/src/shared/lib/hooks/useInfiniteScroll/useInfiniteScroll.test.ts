import { RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

describe('useInfiniteScroll', () => {
    let observe: jest.Mock;
    let unobserve: jest.Mock;
    let intersectionCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;

    beforeEach(() => {
        observe = jest.fn();
        unobserve = jest.fn();

        (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = jest.fn((callback) => {
            intersectionCallback = callback;
            return { observe, unobserve, disconnect: jest.fn() };
        });
    });

    function makeRef<T extends HTMLElement>(element: T): RefObject<T> {
        return { current: element };
    }

    test('does nothing when there is no callback', () => {
        const wrapperRef = makeRef(document.createElement('div'));
        const triggerRef = makeRef(document.createElement('div'));

        renderHook(() => useInfiniteScroll({ wrapperRef, triggerRef }));

        expect(observe).not.toHaveBeenCalled();
    });

    test('observes the trigger element when a callback is provided', () => {
        const wrapperElement = document.createElement('div');
        const triggerElement = document.createElement('div');
        const wrapperRef = makeRef(wrapperElement);
        const triggerRef = makeRef(triggerElement);
        const callback = jest.fn();

        renderHook(() => useInfiniteScroll({ callback, wrapperRef, triggerRef }));

        expect(observe).toHaveBeenCalledWith(triggerElement);
    });

    test('calls the callback when the trigger intersects', () => {
        const wrapperRef = makeRef(document.createElement('div'));
        const triggerRef = makeRef(document.createElement('div'));
        const callback = jest.fn();

        renderHook(() => useInfiniteScroll({ callback, wrapperRef, triggerRef }));
        intersectionCallback([{ isIntersecting: true }]);

        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('does not call the callback when the trigger is not intersecting', () => {
        const wrapperRef = makeRef(document.createElement('div'));
        const triggerRef = makeRef(document.createElement('div'));
        const callback = jest.fn();

        renderHook(() => useInfiniteScroll({ callback, wrapperRef, triggerRef }));
        intersectionCallback([{ isIntersecting: false }]);

        expect(callback).not.toHaveBeenCalled();
    });

    test('unobserves the trigger element on unmount', () => {
        const triggerElement = document.createElement('div');
        const wrapperRef = makeRef(document.createElement('div'));
        const triggerRef = makeRef(triggerElement);
        const callback = jest.fn();

        const { unmount } = renderHook(() => useInfiniteScroll({ callback, wrapperRef, triggerRef }));
        unmount();

        expect(unobserve).toHaveBeenCalledWith(triggerElement);
    });
});
