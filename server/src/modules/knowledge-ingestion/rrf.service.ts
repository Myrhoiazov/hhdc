// Reciprocal Rank Fusion — merges independently-ranked lists (vector cosine order, BM25 order)
// into one ranking using rank position, not raw score, so lists on incompatible scales (0-1
// cosine similarity vs. unbounded BM25) combine meaningfully. Ported from the rag/ reference
// project's src/rrf.ts.
export interface RankedById {
    id: string;
}

const RRF_K = 60; // standard RRF constant

export const fuseRankedLists = <T extends RankedById>(...rankedLists: T[][]): T[] => {
    const scores = new Map<string, { item: T; score: number }>();
    for (const list of rankedLists) {
        list.forEach((item, rank) => {
            const contribution = 1 / (RRF_K + rank + 1);
            const existing = scores.get(item.id);
            scores.set(item.id, existing ? { item: existing.item, score: existing.score + contribution } : { item, score: contribution });
        });
    }
    return Array.from(scores.values()).sort((a, b) => b.score - a.score).map((entry) => entry.item);
};
