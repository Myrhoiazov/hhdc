import { useEffect, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

// Debounces typing so callers don't fire a search request on every keystroke.
export const useEmailSearch = () => {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [searchInput]);

    return { searchInput, setSearchInput, search };
};
