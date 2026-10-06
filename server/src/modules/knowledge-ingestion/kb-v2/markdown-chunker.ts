import { CITY_ALIASES, STYLE_ALIASES, findFirstAlias } from './entity-aliases';
import type { KnowledgeChunkV2, KnowledgeDocumentV2 } from './kb-v2.types';

// Structure-aware chunking for ddc-knowledge-v2: one H2 section = one chunk (H3 stays inside its
// parent), so a FAQ question/answer or a business rule is never cut in half. Only a section
// larger than maxCharacters is split, and then only on paragraph boundaries. Response examples
// are always a single chunk — a half example teaches the wrong structure.

export const DEFAULT_V2_CHUNK_CHARACTERS = 900;
const MIN_PREAMBLE_CHARACTERS = 40;
const SOURCE_HEADING = /^sources?$/i;

interface MarkdownSection { heading: string | null; text: string }

// The KB was converted with pandoc: `---` = em dash, `--` between digits = en dash, and bullet
// lists were re-wrapped inline ("Monday: - 16:00--17:00 ... - 17:00--18:00"). Restoring line
// breaks makes schedules scannable for a small model and keeps one fact per line.
// Soft line wraps are joined first ("High\nHeels" → "High Heels"), so a value never straddles
// lines; blank lines, list items and lines ending in ":" (labels, converted H3) keep their breaks.
export const cleanMarkdownText = (value: string): string => value
    .replace(/\\([[\]*_#])/g, '$1')
    .replace(/^#{3,6}[ \t]+(.+?)[ \t]*\n(?:[ \t]*\n)?/gm, '$1:\n')
    .replace(/([^\n:])\n(?!\n|[ \t]*[-*]\s|[ \t]*\d+\.\s)/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s*---\s*/g, ' — ')
    .replace(/(\d)--(\d)/g, '$1–$2')
    .replace(/([:;])\s+-\s+/g, '$1\n- ')
    .replace(/\s+-\s+(?=\d{1,2}:\d{2})/g, '\n- ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const isDroppedLine = (line: string) => /^#\s/.test(line) || /^>/.test(line);

export const splitMarkdownSections = (content: string): MarkdownSection[] => {
    const sections: MarkdownSection[] = [{ heading: null, text: '' }];
    for (const line of content.split(/\r?\n/)) {
        if (isDroppedLine(line)) continue;
        const h2 = /^##\s+(.+?)\s*$/.exec(line);
        if (h2) sections.push({ heading: h2[1].replace(/\\/g, '').trim(), text: '' });
        else sections[sections.length - 1].text += `${line}\n`;
    }
    return sections
        .map((section) => ({ heading: section.heading, text: cleanMarkdownText(section.text) }))
        .filter((section) => section.text && !(section.heading && SOURCE_HEADING.test(section.heading)));
};

// Paragraph-boundary split for oversized sections; a paragraph longer than the limit is kept
// whole rather than cut mid-sentence (the KB has none, but a fact must never be split).
export const splitOversizedText = (text: string, maxCharacters: number): string[] => {
    if (text.length <= maxCharacters) return [text];
    const parts: string[] = [];
    let current = '';
    for (const paragraph of text.split(/\n{2,}/)) {
        if (current && current.length + paragraph.length + 2 > maxCharacters) {
            parts.push(current);
            current = paragraph;
        } else current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
    if (current) parts.push(current);
    return parts;
};

const NON_SLUG_CHARACTERS = new RegExp('[^\\p{L}\\p{N}]+', 'gu');
const slugify = (value: string) => value.toLowerCase().replace(NON_SLUG_CHARACTERS, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'section';

const uniqueSlug = (slug: string, used: Map<string, number>): string => {
    const count = (used.get(slug) ?? 0) + 1;
    used.set(slug, count);
    return count === 1 ? slug : `${slug}_${count}`;
};

const selectSections = (document: KnowledgeDocumentV2): MarkdownSection[] => {
    const sections = splitMarkdownSections(document.content);
    // Collapse only examples and heading-less documents: a lone "## Rotterdam" section must keep
    // its heading, or the chunk loses the city it inherits from it.
    if (document.metadata.priority === 'example' || sections.every((section) => !section.heading)) {
        const text = sections.map((section) => (section.heading ? `${section.heading}:\n${section.text}` : section.text)).join('\n\n');
        return text ? [{ heading: null, text }] : [];
    }
    return sections.filter((section) => section.heading || section.text.length >= MIN_PREAMBLE_CHARACTERS);
};

// "## Rotterdam" inside the city-agnostic schedule document → this chunk is about Rotterdam.
const headingEntities = (document: KnowledgeDocumentV2, heading: string | null) => {
    if (!heading) return {};
    const city = document.metadata.city ?? findFirstAlias(heading, CITY_ALIASES);
    const style = document.metadata.style ?? findFirstAlias(heading, STYLE_ALIASES);
    return { ...(city ? { city } : {}), ...(style ? { style } : {}) };
};

interface ChunkDraft { heading: string | null; text: string; section: string }

const expandSections = (document: KnowledgeDocumentV2, maxCharacters: number): ChunkDraft[] => {
    const used = new Map<string, number>();
    return selectSections(document).flatMap((section) => {
        const slug = uniqueSlug(section.heading ? slugify(section.heading) : 'main', used);
        const parts = splitOversizedText(section.text, maxCharacters);
        return parts.map((text, index) => ({ heading: section.heading, text, section: parts.length > 1 ? `${slug}_p${index + 1}` : slug }));
    });
};

export const chunkKnowledgeDocumentV2 = (document: KnowledgeDocumentV2, maxCharacters = DEFAULT_V2_CHUNK_CHARACTERS): KnowledgeChunkV2[] => {
    const documentId = document.metadata.id;
    return expandSections(document, maxCharacters).map((draft, ordinal) => {
        const chunkId = `${documentId}#${draft.section}`;
        const headingPath = draft.heading ? [document.title, draft.heading] : [document.title];
        return {
            chunkId,
            documentId,
            ordinal,
            headingPath,
            content: `${headingPath.join(' — ')}\n${draft.text}`,
            metadata: { ...document.metadata, ...headingEntities(document, draft.heading), documentId, chunkId, section: draft.section, sourcePath: document.sourcePath },
        };
    });
};
