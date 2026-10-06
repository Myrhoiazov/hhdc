import { useCallback, useState } from 'react';

export const useGroupFilters = () => {
    const [filterStyle, setFilterStyle] = useState('');
    const [filterChoreographer, setFilterChoreographer] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    const onReset = useCallback(() => {
        setFilterStyle('');
        setFilterChoreographer('');
        setFilterLevel('');
    }, []);

    return {
        filterStyle, setFilterStyle, filterChoreographer, setFilterChoreographer, filterLevel, setFilterLevel, onReset,
    };
};
