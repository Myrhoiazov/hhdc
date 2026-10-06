import { useEffect, useRef, useState } from 'react';

// Sidebar auto-collapses to icon-only in this range so it doesn't crowd out page content;
// below it the mobile off-canvas overlay takes over, above it there's room for the full width.
const TABLET_COLLAPSE_QUERY = '(min-width: 769px) and (max-width: 1024px)';

// Auto-collapses on tablet widths unless the user has already toggled it manually.
export const useTabletCollapse = () => {
    const [collapsed, setCollapsed] = useState(false);
    const userToggledRef = useRef(false);

    useEffect(() => {
        const mql = window.matchMedia(TABLET_COLLAPSE_QUERY);
        const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
            if (!userToggledRef.current) {
                setCollapsed(e.matches);
            }
        };
        handleChange(mql);
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const onToggle = () => {
        userToggledRef.current = true;
        setCollapsed((prev) => !prev);
    };

    return { collapsed, onToggle };
};
