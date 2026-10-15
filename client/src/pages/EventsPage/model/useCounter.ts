import { useCallback, useState } from 'react';

// The pay of the team is kept among the expenses, so a change in one block is read by the other.
export const useCounter = (): [number, () => void] => {
    const [count, setCount] = useState(0);
    return [count, useCallback(() => setCount((current) => current + 1), [])];
};
