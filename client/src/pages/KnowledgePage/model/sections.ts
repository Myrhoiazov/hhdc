export type KnowledgeTab = 'documents' | 'simulation' | 'prompts';

export const TABS: { id: KnowledgeTab; label: string }[] = [
    { id: 'documents', label: 'Knowledge documents' },
    { id: 'simulation', label: 'Email simulation' },
    { id: 'prompts', label: 'Prompts' },
];
