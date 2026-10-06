import { KnowledgeVisibility } from '@prisma/client';

// Retrieval permission filter (spec §60), applied in SQL before lexical/vector ranking.
// PRIVATE knowledge is never retrievable by AI.
export const DEFAULT_VISIBILITY: KnowledgeVisibility[] = ['PUBLIC_OPERATIONAL', 'INTERNAL'];

export const allowedKnowledgeVisibility = (permissions: string[]): KnowledgeVisibility[] =>
    permissions.includes('finance.read') ? [...DEFAULT_VISIBILITY, 'FINANCE'] : DEFAULT_VISIBILITY;
