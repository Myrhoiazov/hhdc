export const chunkKnowledge = (content: string): string[] => {
    const result: string[] = [];
    const normalized = content.trim();
    for (let offset = 0; offset < normalized.length; offset += 1050) {
        const chunk = normalized.slice(offset, offset + 1200).trim();
        if (chunk) result.push(chunk);
        if (offset + 1200 >= normalized.length) break;
    }
    return result;
};
