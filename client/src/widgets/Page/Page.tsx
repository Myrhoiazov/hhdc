import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, ReactNode, RefObject, UIEvent, useRef } from 'react';
import { useInfiniteScroll } from '@/shared/lib/hooks/useInfiniteScroll/useInfiniteScroll';
import cls from './Page.module.scss';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { useThrottle } from '@/shared/lib/hooks/useThrottle/useThrottle';
import { useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { getUIScrollByPath, uiActions } from '@/features/UI';
import { StateSchema } from '@/app/providers/StoreProvider';

interface PageProps {
    className?: string;
    children: ReactNode;
    onScrollEnd?: () => void;
}

export const Page = memo((props: PageProps) => {
    const { className, children, onScrollEnd } = props;
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const { pathname } = useLocation();
    const scrollPosition = useSelector((state: StateSchema) => getUIScrollByPath(state, pathname));

    useInfiniteScroll({
        triggerRef: triggerRef as RefObject<HTMLElement>,
        wrapperRef: wrapperRef as RefObject<HTMLElement>,
        callback: onScrollEnd,
    });

    useInitialEffect(() => {
        setTimeout(() => {
            if (wrapperRef.current) {
                wrapperRef.current.scrollTop = scrollPosition;
            }
        }, 50);
    });

    const onScroll = useThrottle((e: UIEvent<HTMLDivElement>) => {
        dispatch(
            uiActions.setScrollPosition({
                position: e.currentTarget.scrollTop,
                path: pathname,
            })
        );
    }, 500);

    return (
        <section
            onScroll={onScroll}
            ref={wrapperRef}
            className={classNames(cls.Page, {}, [className])}
        >
            {children}
            {onScrollEnd && <div className={cls.trigger} ref={triggerRef} />}
        </section>
    );
});
