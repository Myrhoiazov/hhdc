import path from 'node:path';
import prisma from '../prisma/prisma-client';
import { aiConfig } from '../src/config/ai.config';
import {
    createPrismaKbV2Store,
    indexKnowledgeBaseV2,
    loadKnowledgeBaseV2,
    OllamaEmbeddingClient,
    validateKnowledgeBaseV2,
    type KbIssue,
    type KbValidationResult,
    type LoadedKnowledgeBase,
} from '../src/modules/knowledge-ingestion';

// RAG v2 knowledge base CLI (ddc-knowledge-v2):
//   npm run knowledge:validate [-- <path>]   metadata/structure checks, no DB/Ollama access
//   npm run knowledge:index    [-- <path>]   validate, then embed new/changed documents only
//   npm run knowledge:reindex  [-- <path>]   validate, then re-embed every document
// <path> defaults to RAG_KNOWLEDGE_PATH. Indexing aborts on any validation error.

type Command = 'validate' | 'index' | 'reindex';
const COMMANDS: readonly Command[] = ['validate', 'index', 'reindex'];

const parseArguments = (argv: string[]): { command: Command; root: string } => {
    const [command, root] = argv;
    if (!COMMANDS.includes(command as Command)) throw new Error(`Usage: knowledge-v2 <${COMMANDS.join('|')}> [knowledge-path]`);
    return { command: command as Command, root: path.resolve(root || aiConfig.ragKnowledgePath) };
};

const formatIssue = (issue: KbIssue) => `  [${issue.severity}] ${issue.sourcePath}: ${issue.code} — ${issue.message}`;

const printValidation = (knowledgeBase: LoadedKnowledgeBase, validation: KbValidationResult): void => {
    console.log(`Knowledge base: ${knowledgeBase.root}`);
    console.log(`Documents: ${knowledgeBase.documents.length} (front matter: ${knowledgeBase.documents.filter((document) => document.hasFrontMatter).length}), ignored files: ${knowledgeBase.ignored.length}`);
    [...validation.errors, ...validation.warnings].forEach((issue) => console.log(formatIssue(issue)));
    console.log(`Errors: ${validation.errors.length}, warnings: ${validation.warnings.length}`);
};

const runIndex = async (knowledgeBase: LoadedKnowledgeBase, full: boolean): Promise<boolean> => {
    const result = await indexKnowledgeBaseV2(knowledgeBase.documents, {
        embeddings: new OllamaEmbeddingClient(),
        store: createPrismaKbV2Store(),
        embeddingModel: aiConfig.ollamaEmbeddingModel,
        report: (event) => console.log(JSON.stringify(event)),
    }, { full });
    console.log(JSON.stringify({ status: 'complete', mode: full ? 'reindex' : 'index', ...result }));
    return result.failed.length === 0;
};

const main = async (): Promise<void> => {
    const { command, root } = parseArguments(process.argv.slice(2));
    const knowledgeBase = await loadKnowledgeBaseV2(root);
    const validation = validateKnowledgeBaseV2(knowledgeBase.documents);
    printValidation(knowledgeBase, validation);
    if (!validation.ok) throw new Error('Validation failed — fix the errors above before indexing.');
    if (command === 'validate') return;
    if (!(await runIndex(knowledgeBase, command === 'reindex'))) process.exitCode = 1;
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect().catch((): void => undefined));
