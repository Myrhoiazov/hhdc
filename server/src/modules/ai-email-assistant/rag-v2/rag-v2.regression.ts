import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { EmailClassification } from '../email-assistant.service';
import { allChunks } from './rag-v2-draft.service';
import type { LayeredKnowledge } from './layered-retriever';
import type { QueryUnderstanding } from './rag-v2.types';

// Shared by the CI regression test (deterministic: understanding + retrieval) and the live
// `npm run knowledge:eval` script (adds mustContain/mustNotContain checks on a real Ollama draft).

export interface RegressionCase {
    id: string;
    message: string;
    llm: { language: EmailClassification['language']; intent: EmailClassification['intent'] };
    expectedIntent: string;
    expectedSubintent?: string;
    expectedLanguage: string;
    expectedEntities: Record<string, string | number | null>;
    // A document id ("location_rotterdam") matches any of its chunks; a chunk id
    // ("schedule_current#rotterdam") matches only that chunk.
    mustRetrieve: string[];
    mustNotRetrieve: string[];
    mustContain: string[];
    mustNotContain: string[];
}

export const REGRESSION_CASES: RegressionCase[] = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', 'rag-v2-regression.json'), 'utf8'));

const matchesReference = (reference: string, chunk: { documentId: string; chunkId: string }) => (
    reference.includes('#') ? chunk.chunkId === reference : chunk.documentId === reference
);

export const checkUnderstanding = (testCase: RegressionCase, understanding: QueryUnderstanding): string[] => [
    understanding.intent === testCase.expectedIntent ? null : `intent ${understanding.intent} ≠ ${testCase.expectedIntent}`,
    !testCase.expectedSubintent || understanding.subintent === testCase.expectedSubintent ? null : `subintent ${understanding.subintent} ≠ ${testCase.expectedSubintent}`,
    understanding.language === testCase.expectedLanguage ? null : `language ${understanding.language} ≠ ${testCase.expectedLanguage}`,
    ...Object.entries(testCase.expectedEntities).map(([key, value]) => {
        const actual = understanding.entities[key as keyof QueryUnderstanding['entities']];
        return actual === value ? null : `entity ${key}=${String(actual)} ≠ ${String(value)}`;
    }),
].filter((problem): problem is string => problem !== null);

export const checkRetrieval = (testCase: RegressionCase, knowledge: LayeredKnowledge): string[] => {
    const chunks = allChunks(knowledge).map(({ chunk }) => chunk);
    return [
        ...testCase.mustRetrieve.filter((reference) => !chunks.some((chunk) => matchesReference(reference, chunk))).map((reference) => `missing ${reference}`),
        ...testCase.mustNotRetrieve.filter((reference) => chunks.some((chunk) => matchesReference(reference, chunk))).map((reference) => `unexpected ${reference}`),
    ];
};

export const checkDraft = (testCase: RegressionCase, draft: string): string[] => {
    const lowered = draft.toLowerCase();
    return [
        ...testCase.mustContain.filter((text) => !lowered.includes(text.toLowerCase())).map((text) => `draft lacks "${text}"`),
        ...testCase.mustNotContain.filter((text) => lowered.includes(text.toLowerCase())).map((text) => `draft contains "${text}"`),
    ];
};
