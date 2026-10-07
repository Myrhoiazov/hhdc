export interface EmbeddingClient {
    embed(text: string): Promise<number[]>;
}

export const cosineSimilarity = (left: number[], right: number[]): number => {
    if (!left.length || left.length !== right.length) return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftNorm += left[index] ** 2;
        rightNorm += right[index] ** 2;
    }
    const norm = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
    return norm ? dot / norm : 0;
};
