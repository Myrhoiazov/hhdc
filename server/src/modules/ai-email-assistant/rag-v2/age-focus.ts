import type { LayeredKnowledge, RetrievedChunk } from './layered-retriever';

// When the student's age is known, schedule lines for groups whose age band excludes them are
// removed from the facts before prompting. Measured live: qwen3:1.7b otherwise offered a 14-year-
// old the 18+ High Heels group and a 13-year-old the 5–7 kids group. If no line matches the age,
// the chunk is left untouched (the business rule is then "no exact match → staff confirms").

const BAND_PATTERN = /—\s*(\d{1,2})\s*(?:[–-]\s*(\d{1,2})|(\+))\s*$/;

interface AgeBand { min: number; max: number }

export const parseAgeBand = (line: string): AgeBand | null => {
    const match = line.match(BAND_PATTERN);
    if (!match) return null;
    return { min: Number(match[1]), max: match[3] ? Number.POSITIVE_INFINITY : Number(match[2]) };
};

const isDayHeader = (line: string) => /^[^-].*:\s*$/.test(line.trim());

// Drops day headers ("Monday:") left without any group line after filtering.
const dropEmptyHeaders = (lines: string[]): string[] => lines.filter((line, index) => {
    if (!isDayHeader(line)) return true;
    const next = lines.slice(index + 1).find((candidate) => candidate.trim());
    return Boolean(next && !isDayHeader(next));
});

export const focusContentOnAge = (content: string, age: number): string => {
    const lines = content.split('\n');
    const bands = lines.map(parseAgeBand);
    if (!bands.some((band) => band && age >= band.min && age <= band.max)) return content;
    const kept = lines.filter((_line, index) => {
        const band = bands[index];
        return !band || (age >= band.min && age <= band.max);
    });
    // Chunk content is "<heading line>\n<body>": a blank line left right under the heading (the
    // removed first day block) or at the end is dropped, double blanks collapse.
    return dropEmptyHeaders(kept).join('\n').replace(/\n{3,}/g, '\n\n').replace(/^([^\n]*)\n\n/, '$1\n').trim();
};

const focusChunk = (chunk: RetrievedChunk, age: number): RetrievedChunk => {
    const content = focusContentOnAge(chunk.content, age);
    return content === chunk.content ? chunk : { ...chunk, content };
};

export const focusKnowledgeOnAge = (knowledge: LayeredKnowledge, age: number | null): LayeredKnowledge => (
    age === null ? knowledge : { ...knowledge, facts: knowledge.facts.map((chunk) => focusChunk(chunk, age)) }
);
