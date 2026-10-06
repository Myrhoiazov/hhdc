const VARIABLE = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*)\s*\}\}/g;
const UNSAFE_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export type TemplateContext = Record<string, unknown>;

export const templateVariables = (content: string): string[] =>
    [...new Set([...content.matchAll(VARIABLE)].map(match => match[1]))];

const resolvePath = (context: TemplateContext, path: string): unknown => {
    let current: unknown = context;
    for (const segment of path.split('.')) {
        if (UNSAFE_SEGMENTS.has(segment) || typeof current !== 'object' || current === null) return undefined;
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
};

const isMissing = (value: unknown) => value === undefined || value === null || value === '';

export class MissingTemplateVariablesError extends Error {
    constructor(public readonly missing: string[]) {
        super(`Template variables are missing: ${missing.join(', ')}`);
    }
}

// Rendering fails safely: a message with an unresolved variable is never produced.
export const renderTemplate = (content: string, context: TemplateContext): string => {
    const missing = templateVariables(content).filter(path => isMissing(resolvePath(context, path)));
    if (missing.length) throw new MissingTemplateVariablesError(missing);
    return content.replace(VARIABLE, (_match, path: string) => String(resolvePath(context, path)));
};
