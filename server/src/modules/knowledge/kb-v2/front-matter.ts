import { parse as parseYaml } from 'yaml';

export interface FrontMatterResult {
    data: Record<string, unknown>;
    body: string;
    hasFrontMatter: boolean;
    error?: string;
}

const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const parseYamlBlock = (block: string): { data: Record<string, unknown>; error?: string } => {
    try {
        const parsed: unknown = parseYaml(block);
        if (parsed === null || parsed === undefined) return { data: {} };
        if (typeof parsed !== 'object' || Array.isArray(parsed)) return { data: {}, error: 'front matter must be a YAML mapping' };
        return { data: parsed as Record<string, unknown> };
    } catch (error) {
        return { data: {}, error: error instanceof Error ? error.message.split('\n')[0] : String(error) };
    }
};

// Files without a leading `---` block are valid (metadata is then inferred from the path); a
// block that exists but is not valid YAML is reported, never silently treated as prose.
export const parseFrontMatter = (raw: string): FrontMatterResult => {
    const text = raw.replace(/^﻿/, '');
    const match = FRONT_MATTER_PATTERN.exec(text);
    if (!match) return { data: {}, body: text, hasFrontMatter: false };
    const { data, error } = parseYamlBlock(match[1]);
    return { data, body: text.slice(match[0].length), hasFrontMatter: true, error };
};
