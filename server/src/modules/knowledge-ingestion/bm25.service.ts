// Okapi BM25, pure TS, no external dependency — ported from the rag/ reference project's
// src/bm25.ts. Complements vector search: catches exact keyword/term/name matches (style names,
// prices, specific phrases) that semantic embedding similarity can miss or under-rank.
export interface Bm25Document {
    id: string;
    content: string;
}

export interface Bm25ScoredDocument<T extends Bm25Document> {
    doc: T;
    score: number;
}

interface TokenizedDoc<T> {
    doc: T;
    freq: Map<string, number>;
    length: number;
}

// Deliberately avoids `\p{L}`/`u`-flag Unicode property escapes and direct for-of/spread over a
// Set/Map — this project's ts-node runtime target rejects both (TS1501/TS2802) even though plain
// `tsc --noEmit` accepts them; see the project memory on the tsc-vs-ts-node lib mismatch. An
// explicit Latin+Cyrillic character class and `Array.from(...)` (already used elsewhere in this
// module, e.g. knowledge-ingestion.service.ts) sidestep both restrictions.
const tokenize = (text: string): string[] => text
    .toLowerCase()
    .replace(/[^a-z0-9а-яёіїєґ_]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

export class Bm25Search<T extends Bm25Document> {
    private readonly docs: TokenizedDoc<T>[];
    private readonly docCount: number;
    private readonly avgDocLength: number;
    private readonly documentFrequency = new Map<string, number>();
    private readonly k1 = 1.5;
    private readonly b = 0.75;

    public constructor(chunks: T[]) {
        this.docs = chunks.map((doc) => {
            const tokens = tokenize(doc.content);
            const freq = new Map<string, number>();
            for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
            return { doc, freq, length: tokens.length };
        });
        this.docCount = this.docs.length;
        this.avgDocLength = this.docCount === 0 ? 0 : this.docs.reduce((sum, entry) => sum + entry.length, 0) / this.docCount;
        for (const entry of this.docs) {
            for (const term of Array.from(entry.freq.keys())) {
                this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
            }
        }
    }

    // Only documents with at least one matching term are returned (score > 0) — a query with no
    // literal term overlap against the corpus yields an empty list, which the caller's RRF fusion
    // treats as "BM25 found nothing", degrading gracefully to vector-only ranking.
    public search(queryText: string): Array<Bm25ScoredDocument<T>> {
        const terms = Array.from(new Set(tokenize(queryText)));
        return this.docs
            .map((entry) => {
                let score = 0;
                for (const term of terms) {
                    const termFrequency = entry.freq.get(term) ?? 0;
                    if (!termFrequency) continue;
                    const documentFrequency = this.documentFrequency.get(term) ?? 0;
                    const inverseDocumentFrequency = Math.log(1 + (this.docCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
                    const denominator = termFrequency + this.k1 * (1 - this.b + this.b * (entry.length / this.avgDocLength));
                    score += inverseDocumentFrequency * ((termFrequency * (this.k1 + 1)) / denominator);
                }
                return { doc: entry.doc, score };
            })
            .filter((scored) => scored.score > 0)
            .sort((a, b) => b.score - a.score);
    }
}
