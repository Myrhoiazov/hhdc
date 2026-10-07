// Word-prefix alias matching shared by knowledge metadata and customer-message understanding.
// Aliases are matched on lower-cased, hyphen/space-collapsed text, so Russian/Ukrainian case
// endings ("билета", "повернення") resolve without a stemmer.

export interface AliasTable { [canonical: string]: readonly string[] }

// Built via the constructor: server tsconfig targets ES5, which rejects `u`-flag regex literals,
// while the Node runtime supports Unicode property escapes.
const NON_WORD_CHARACTERS = new RegExp("[^\\p{L}\\p{N}' ]+", 'gu');

export const normalizeAliasText = (value: string): string => value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’ʼ`]/g, "'")
    .replace(/[-_/]+/g, ' ')
    .replace(NON_WORD_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word-prefix match: alias must start at a word boundary; trailing letters (case endings) allowed.
const aliasPattern = (alias: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalizeAliasText(alias))}`, 'u');

const compiledCache = new WeakMap<AliasTable, Array<[string, RegExp[]]>>();

const compile = (table: AliasTable): Array<[string, RegExp[]]> => {
    const cached = compiledCache.get(table);
    if (cached) return cached;
    const compiled = Object.entries(table).map(([canonical, aliases]): [string, RegExp[]] => [canonical, aliases.map(aliasPattern)]);
    compiledCache.set(table, compiled);
    return compiled;
};

// All canonical ids mentioned in the text, in table order (stable, deterministic).
export const findAliases = (text: string, table: AliasTable): string[] => {
    const normalized = normalizeAliasText(text);
    return compile(table)
        .filter(([, patterns]) => patterns.some((pattern) => pattern.test(normalized)))
        .map(([canonical]) => canonical);
};

export const findFirstAlias = (text: string, table: AliasTable): string | undefined => findAliases(text, table)[0];
