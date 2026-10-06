// Canonical entity ids shared by knowledge metadata (ingestion) and customer-message entity
// extraction (ai-email-assistant/rag-v2) — both sides must normalize to the same value or
// metadata filtering silently matches nothing.
//
// Aliases are matched as word prefixes on lower-cased, hyphen/space-collapsed text, so Russian/
// Ukrainian case endings ("в Роттердаме", "з Амстердама") resolve without a stemmer.

export interface AliasTable { [canonical: string]: readonly string[] }

export const CITY_ALIASES: AliasTable = {
    amsterdam: ['amsterdam', 'амстердам'],
    rotterdam: ['rotterdam', 'роттердам', 'ротердам'],
    den_haag: ['den haag', 'denhaag', 'the hague', 'hague', 'гаага', 'гааг', 'ден хааг', 'дан хааг', "s-gravenhage", 'gravenhage'],
    utrecht: ['utrecht', 'утрехт'],
    apeldoorn: ['apeldoorn', 'апелдорн', 'апельдорн', 'апельдоорн'],
    arnhem: ['arnhem', 'арнем', 'арнхем', 'арнгем'],
};

export const STYLE_ALIASES: AliasTable = {
    hip_hop: ['hip hop', 'hiphop', 'хип хоп', 'хипхоп', 'хiп хоп', 'хіп хоп', 'хіпхоп'],
    high_heels: ['high heels', 'highheels', 'heels', 'хай хилс', 'хайхилс', 'хилс', 'каблук', 'підбор'],
    jazz_funk: ['jazz funk', 'jazzfunk', 'джаз фанк', 'джазфанк'],
    street_jazz: ['street jazz', 'streetjazz', 'стрит джаз', 'стріт джаз'],
    contemporary: ['contemporary', 'контемпорари', 'контемп', 'контемпорарі'],
    kids_dance: ['kids dance', 'kidsdance'],
};

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

// Metadata values ("den-haag", "Den Haag", "hip-hop") → canonical id; unknown values are only
// snake_cased so custom front matter still round-trips predictably.
export const normalizeEntityValue = (value: string, table: AliasTable): string => {
    const direct = normalizeAliasText(value).replace(/ /g, '_');
    if (direct in table) return direct;
    return findFirstAlias(value, table) ?? direct;
};
