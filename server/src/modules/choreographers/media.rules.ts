// Pure rules for a choreographer's photo set, kept apart from storage and the database.

export const MAX_ACTIVE_PHOTOS = 10;

export interface MediaOrderItem { id: string; position: number; isCover: boolean }

export const canAddPhoto = (activeCount: number): boolean => activeCount < MAX_ACTIVE_PHOTOS;

// A reorder request must name every active photo exactly once.
export const isCompleteOrder = (activeIds: string[], requestedIds: string[]): boolean =>
    activeIds.length === requestedIds.length && new Set(requestedIds).size === requestedIds.length && requestedIds.every(id => activeIds.includes(id));

// After the cover is removed the first remaining photo takes over, so there is always one cover.
export const nextCoverId = (remaining: MediaOrderItem[]): string | null => {
    if (!remaining.length || remaining.some(item => item.isCover)) return null;
    return [...remaining].sort((a, b) => a.position - b.position)[0].id;
};
