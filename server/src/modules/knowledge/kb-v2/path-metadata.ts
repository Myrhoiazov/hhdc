import path from 'node:path';
import type { KnowledgeCategoryV2, KnowledgeMetadataV2, KnowledgePriority } from './kb-v2.types';

// Defaults for files without front matter (the runtime and CRM-contract notes of
// hhdc-knowledge-v2). Front matter, when present, always wins field by field.

interface FolderRule { category: KnowledgeCategoryV2; priority: KnowledgePriority; topic?: string }

const FOLDER_RULES: Record<string, FolderRule> = {
    '00_runtime': { category: 'rule', priority: 'rules', topic: 'runtime' },
    '13_crm_contract': { category: 'rule', priority: 'rules', topic: 'crm' },
    '09_business_rules': { category: 'rule', priority: 'rules' },
    '11_response_style': { category: 'rule', priority: 'rules', topic: 'style' },
    '08_faq': { category: 'faq', priority: 'faq' },
    '10_response_examples': { category: 'example', priority: 'example' },
};

const snake = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// relativePath uses forward slashes and may start with the knowledge-base folder name
// ("hhdc-knowledge-v2/00_runtime/answerability.md").
export const inferPathMetadata = (relativePath: string): Partial<KnowledgeMetadataV2> => {
    const segments = relativePath.split('/');
    const folder = segments.find(segment => segment in FOLDER_RULES);
    const rule = folder ? FOLDER_RULES[folder] : undefined;
    const id = snake(path.posix.basename(relativePath, path.extname(relativePath))) || 'document';
    if (!rule) return { id, category: 'meta', priority: 'rules', dynamic: false, language: 'canonical' };
    return { id, category: rule.category, priority: rule.priority, dynamic: false, language: 'canonical', ...(rule.topic ? { topic: rule.topic } : {}) };
};
