import { ChoreographerHistoryItem } from '@/entities/Choreographer';

// Newest year first; the items inside a year keep the order the server gave them.
export const groupByYear = (
    items: ChoreographerHistoryItem[]
): [number, ChoreographerHistoryItem[]][] => {
    const groups = new Map<number, ChoreographerHistoryItem[]>();
    items.forEach((item) => groups.set(item.year, [...(groups.get(item.year) ?? []), item]));
    return Array.from(groups.entries()).sort(([a], [b]) => b - a);
};
