import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutofocusResult<T extends HTMLElement> {
    ref: React.RefObject<T | null>;
    isFocused: boolean;
    onFocus: () => void;
    onBlur: () => void;
}

export const useAutofocus = <T extends HTMLElement>(autofocus?: boolean): UseAutofocusResult<T> => {
    const ref = useRef<T>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (autofocus) {
            setIsFocused(true);
            ref.current?.focus();
        }
    }, [autofocus]);

    const onFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const onBlur = useCallback(() => {
        setIsFocused(false);
    }, []);

    return { ref, isFocused, onFocus, onBlur };
};