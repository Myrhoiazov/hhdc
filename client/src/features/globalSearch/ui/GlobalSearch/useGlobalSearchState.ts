import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildFlatResults, groupByCategory } from './globalSearchResults';
import { MIN_QUERY_LENGTH, useDebouncedGlobalSearch } from './useDebouncedGlobalSearch';
import { useSearchDismiss } from './useSearchDismiss';
import { useSearchKeyboard } from './useSearchKeyboard';

export const useGlobalSearchState = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);

    const trimmedQuery = query.trim();
    const { data, loading, reset } = useDebouncedGlobalSearch(trimmedQuery);

    const flatResults = useMemo(() => buildFlatResults(data), [data]);
    const sections = useMemo(() => groupByCategory(flatResults), [flatResults]);
    const showDropdown = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const closeSearch = useCallback(() => {
        reset();
        setIsExpanded(false);
        setQuery('');
        setActiveIndex(-1);
    }, [reset]);

    const openSearch = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const goTo = useCallback((route: string) => {
        navigate(route);
        closeSearch();
    }, [navigate, closeSearch]);

    useEffect(() => {
        if (isExpanded) inputRef.current?.focus();
    }, [isExpanded]);

    useSearchDismiss(containerRef, isExpanded, closeSearch);

    const onKeyDown = useSearchKeyboard(flatResults, activeIndex, setActiveIndex, goTo, closeSearch);

    useEffect(() => {
        setActiveIndex(-1);
    }, [data]);

    return {
        containerRef, inputRef, isExpanded, query, setQuery, activeIndex, setActiveIndex,
        data, loading, flatResults, sections, showDropdown,
        closeSearch, openSearch, goTo, onKeyDown,
    };
};
