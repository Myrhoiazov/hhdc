// Buyers type their country by hand at checkout: "Deutschland", "Germany" and "Германия" are one
// country. This file turns such text into an ISO 3166 code, or gives up rather than guess.

const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'pl', 'cs', 'uk', 'ru', 'da', 'sv', 'fi', 'et', 'el', 'tr', 'zh'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Names people use that no language's official list contains.
const EXTRA: Record<string, string> = {
    'the netherlands': 'NL', holland: 'NL', hollanda: 'NL', nederlands: 'NL', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
    usa: 'US', uae: 'AE', czech: 'CZ', belgie: 'BE', 'republic of moldova': 'MD', 'south korea': 'KR', russia: 'RU', turkey: 'TR',
};

// Codes of states that no longer exist and of groupings: their names would shadow real countries
// ("DD" is East Germany).
const NOT_COUNTRIES = ['UK', 'DD', 'SU', 'YU', 'CS', 'AN', 'BU', 'ZR', 'TP', 'FX', 'NT', 'QO', 'EU', 'EZ', 'UN', 'ZZ', 'XA', 'XB', 'AC', 'CP', 'DG', 'EA', 'IC', 'TA'];

const regionCodes = (): string[] => {
    const english = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    return LETTERS.flatMap(first => LETTERS.map(second => first + second)).filter(code => english.of(code) && !NOT_COUNTRIES.includes(code));
};

const buildAliases = (): Map<string, string> => {
    const codes = regionCodes();
    const aliases = new Map<string, string>(Object.entries(EXTRA));
    for (const locale of LOCALES) {
        const names = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' });
        for (const code of codes) {
            const name = names.of(code)?.toLowerCase();
            if (name && !aliases.has(name)) aliases.set(name, code);
        }
    }
    for (const code of codes) aliases.set(code.toLowerCase(), code);
    return aliases;
};

let aliases: Map<string, string> | undefined;
const lookup = (name: string): string | undefined => (aliases ??= buildAliases()).get(name);

// Letters only, so "Poland ????" and " france " are found; the rest of the text is kept as typed.
const clean = (text: string): string => text.toLowerCase().replace(/[^\p{L}\s.'-]/gu, ' ').replace(/\s+/g, ' ').trim();

// "Poland Sosnowiec" is Poland: the longest beginning of the text that names a country wins.
const fromBeginning = (text: string): string | undefined => {
    const words = text.split(' ');
    for (let length = words.length; length > 0; length -= 1) {
        const code = lookup(words.slice(0, length).join(' '));
        if (code) return code;
    }
    return undefined;
};

// "Tallinn, Estonia" is Estonia and "Ukraine/Netherlands" is the first country named.
export const countryCode = (raw: string | null | undefined): string | null => {
    const parts = (raw ?? '').split(/[/,;(]/).map(clean).filter(Boolean);
    for (const part of parts) {
        const code = fromBeginning(part);
        if (code) return code;
    }
    return null;
};
