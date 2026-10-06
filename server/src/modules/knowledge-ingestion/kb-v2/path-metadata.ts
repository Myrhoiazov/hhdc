import path from 'node:path';
import { CITY_ALIASES, STYLE_ALIASES, normalizeEntityValue } from './entity-aliases';
import type { KnowledgeCategoryV2, KnowledgeLanguage, KnowledgeMetadataV2, KnowledgePriority } from './kb-v2.types';

// Safe defaults for the ~80% of ddc-knowledge-v2 files that have no front matter. Front matter,
// when present, always wins field by field (see kb-document.ts).

interface FolderRule {
    idPrefix: string;
    category: KnowledgeCategoryV2;
    priority: KnowledgePriority;
    dynamic: boolean;
    // How the file stem maps to a metadata field.
    stemAs?: 'city' | 'style' | 'topic';
    topic?: string;
    dynamicStems?: readonly string[];
}

const FOLDER_RULES: Record<string, FolderRule> = {
    '01_brand': { idPrefix: 'brand', category: 'brand', priority: 'factual', dynamic: false, topic: 'brand' },
    '02_locations': { idPrefix: 'location', category: 'location', priority: 'factual', dynamic: true, stemAs: 'city', topic: 'location' },
    '03_dance_styles': { idPrefix: 'style', category: 'style', priority: 'factual', dynamic: false, stemAs: 'style', topic: 'dance_style' },
    '04_classes': { idPrefix: 'class', category: 'class', priority: 'factual', dynamic: false, stemAs: 'topic' },
    '05_schedule': { idPrefix: 'schedule', category: 'schedule', priority: 'factual', dynamic: true, topic: 'schedule' },
    '06_registration': { idPrefix: 'registration', category: 'registration', priority: 'factual', dynamic: false, topic: 'registration' },
    '07_pricing_payments': { idPrefix: 'pricing', category: 'pricing', priority: 'factual', dynamic: true, topic: 'pricing' },
    '08_faq': { idPrefix: 'faq', category: 'faq', priority: 'faq', dynamic: false, stemAs: 'topic' },
    '08_lito_dance_camp': { idPrefix: 'camp', category: 'camp', priority: 'factual', dynamic: false, topic: 'camp', dynamicStems: ['pricing', 'booking'] },
    '10_business_rules': { idPrefix: 'rule', category: 'rule', priority: 'rules', dynamic: false, stemAs: 'topic' },
    '11_response_examples': { idPrefix: 'ex', category: 'example', priority: 'example', dynamic: false },
    '12_response_style': { idPrefix: 'response_style', category: 'response_style', priority: 'rules', dynamic: false, topic: 'response_style' },
    '13_sources': { idPrefix: 'source', category: 'source', priority: 'factual', dynamic: false, topic: 'source' },
};

// File stems → the shared intent/topic vocabulary the retrieval planner asks for.
const STEM_TOPICS: Record<string, string> = {
    'age-groups': 'age_group', beginners: 'beginner', 'trial-lesson': 'trial', 'what-to-bring': 'clothing',
    cancellations: 'cancellation', children: 'children', clothing: 'clothing', locations: 'location',
    parents: 'parent_question', payments: 'payment', schedule: 'schedule', teenagers: 'teenagers',
    'trial-lessons': 'trial', general: 'general',
    'assistant-rules': 'general', 'escalation-rules': 'escalation', 'forbidden-assumptions': 'general',
    'payment-rules': 'payment', 'registration-rules': 'registration', 'schedule-rules': 'schedule',
};

const EXAMPLE_TOPICS: Record<string, string> = { complaints: 'complaint', payments: 'payment', registration: 'registration', schedule: 'schedule', trial: 'trial' };

const EXAMPLE_LANGUAGE_SUFFIX = /-(ru|uk|nl|en)$/;

const snake = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const stemFields = (rule: FolderRule, stem: string): Partial<KnowledgeMetadataV2> => {
    if (rule.stemAs === 'city') return stem === 'overview' ? {} : { city: normalizeEntityValue(stem, CITY_ALIASES) };
    if (rule.stemAs === 'style') return stem === 'overview' ? {} : { style: normalizeEntityValue(stem, STYLE_ALIASES) };
    if (rule.stemAs === 'topic') return { topic: STEM_TOPICS[stem] ?? snake(stem) };
    return {};
};

const inferExampleMetadata = (segments: string[], stem: string): Partial<KnowledgeMetadataV2> => {
    const folder = segments.length > 2 ? segments[1] : '';
    const language = stem.match(EXAMPLE_LANGUAGE_SUFFIX)?.[1] as KnowledgeLanguage | undefined;
    const subtopic = snake(stem.replace(EXAMPLE_LANGUAGE_SUFFIX, ''));
    const topic = EXAMPLE_TOPICS[folder] ?? (snake(folder) || undefined);
    return { id: ['ex', topic, subtopic, language].filter(Boolean).join('_'), topic, subtopic, language: language ?? 'canonical' };
};

// relativePath uses forward slashes, relative to the knowledge root (e.g. "08_faq/teenagers.md").
export const inferPathMetadata = (relativePath: string): Partial<KnowledgeMetadataV2> => {
    const segments = relativePath.split('/');
    const stem = path.basename(relativePath, path.extname(relativePath));
    const rule = FOLDER_RULES[segments[0]];
    if (!rule) return { id: snake(relativePath.replace(/\.md$/i, '')), category: 'meta', priority: 'rules', dynamic: false, language: 'canonical' };
    const base: Partial<KnowledgeMetadataV2> = {
        id: `${rule.idPrefix}_${snake(stem)}`,
        category: rule.category,
        priority: rule.priority,
        dynamic: rule.dynamic || Boolean(rule.dynamicStems?.includes(stem)),
        language: 'canonical',
        ...(rule.topic ? { topic: rule.topic } : {}),
        ...stemFields(rule, stem),
    };
    return rule.category === 'example' ? { ...base, ...inferExampleMetadata(segments, stem) } : base;
};
