/**
 * Local CLI for exercising the AI email assistant pipeline (normalize → spam check → classify →
 * RAG retrieve → draft) against a hand-written subject/body, without IMAP, without touching
 * ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only against the real
 * CRM (contact lookup) and the real knowledge base (retrieval); nothing is persisted.
 *
 * The actual pipeline run lives in `../src/modules/ai-email-assistant/simulation.service.ts`,
 * shared with the "Симуляция письма" panel on the KnowledgeBasePage admin page (HTTP) — this
 * file is just argument parsing and human-readable/JSON printing around that one call.
 *
 * Usage (from server/, with the environment that points at your Ollama + MySQL):
 *   npm run ai:test-flow -- --subject "Тема" --body "Текст письма" [--from a@b.com]
 *   echo "Текст письма" | npm run ai:test-flow -- --subject "Тема"
 *   npm run ai:test-flow -- --subject "..." --body-file ./sample.txt
 *
 * Flags:
 *   --from <email>       Sender address, used for CRM contact lookup. Default: test@example.com
 *   --subject <text>     Email subject. Required.
 *   --body <text>        Email body. Omit to read from --body-file or stdin.
 *   --body-file <path>   Read the body from a file instead of --body/stdin.
 *   --top-k <n>          Override RAG_TOP_K for this run only.
 *   --no-knowledge       Skip RAG retrieval entirely (classification-only testing).
 *   --force-draft        Generate a draft even when classification says spam or no reply needed —
 *                         useful to inspect what the model WOULD write, not what the pipeline
 *                         would actually do.
 *   --json                Print one machine-readable JSON object instead of the human-readable
 *                         stage-by-stage output.
 */
import { readFileSync } from 'node:fs';
import prisma from '../prisma/prisma-client';
// Imported directly rather than through the `ai-email-assistant` barrel: the barrel also
// re-exports send.persistence.ts, which pulls in
// communication/email/email-smtp.service.ts -> email-imap.service.ts, which imports back from
// the barrel itself. That cycle resolves fine in the real app's own import order, but a script
// that imports the barrel first hits it mid-evaluation and gets `undefined` exports. This script
// doesn't need the SMTP-sending path at all, so it just avoids the barrel entirely.
import { runEmailAssistantSimulation, type EmailSimulationResult } from '../src/modules/ai-email-assistant/simulation.service';
import { aiConfig } from '../src/config/ai.config';

interface CliArgs {
    from: string;
    subject: string;
    body?: string;
    bodyFile?: string;
    topK?: number;
    noKnowledge: boolean;
    forceDraft: boolean;
    json: boolean;
}

type FlagHandler = (args: CliArgs, next: () => string) => void;

const FLAG_HANDLERS: Record<string, FlagHandler> = {
    '--from': (args, next) => { args.from = next(); },
    '--subject': (args, next) => { args.subject = next(); },
    '--body': (args, next) => { args.body = next(); },
    '--body-file': (args, next) => { args.bodyFile = next(); },
    '--top-k': (args, next) => { args.topK = Number(next()); },
    '--no-knowledge': (args) => { args.noKnowledge = true; },
    '--force-draft': (args) => { args.forceDraft = true; },
    '--json': (args) => { args.json = true; },
};

const parseArgs = (argv: string[]): CliArgs => {
    const args: CliArgs = { from: 'test@example.com', subject: '', noKnowledge: false, forceDraft: false, json: false };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const handler = FLAG_HANDLERS[flag];
        if (!handler) {
            if (flag.startsWith('--')) throw new Error(`Unknown flag: ${flag}`);
            continue;
        }
        handler(args, () => argv[++i]);
    }
    return args;
};

const readStdin = (): Promise<string> => new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
});

const section = (title: string) => console.log(`\n=== ${title} ===`);

const resolveBodyText = async (args: CliArgs): Promise<string> => {
    let bodyText = args.body;
    if (!bodyText && args.bodyFile) bodyText = readFileSync(args.bodyFile, 'utf8');
    if (!bodyText && !process.stdin.isTTY) bodyText = await readStdin();
    if (!bodyText?.trim()) throw new Error('Provide the email body via --body, --body-file, or stdin');
    return bodyText;
};

const printClassification = (result: EmailSimulationResult) => {
    if (!result.classification) return;
    section(`3. CLASSIFY (model: ${aiConfig.ollamaModel})`);
    console.log(result.classification);
};

const printKnowledgeRetrieval = (result: EmailSimulationResult, args: CliArgs) => {
    if (args.noKnowledge) return;
    section(`4. RAG RETRIEVAL (embedding: ${aiConfig.ollamaEmbeddingModel}, topK: ${args.topK ?? aiConfig.ragTopK})`);
    if (!result.knowledge.length) console.log('(no relevant knowledge found)');
    for (const chunk of result.knowledge) console.log(`score=${chunk.score.toFixed(3)}  ${chunk.sourceUrl}\n  ${chunk.content.slice(0, 160).replace(/\n/g, ' ')}`);
};

const printDraft = (result: EmailSimulationResult) => {
    section('5. DRAFT');
    if (!result.classification) {
        console.log('skipped — message was deterministic spam');
    } else if (result.draftSkippedReason) {
        console.log(`skipped — ${result.draftSkippedReason} (use --force-draft to generate anyway)`);
    } else {
        console.log(`(model: ${aiConfig.ollamaModel})`);
        console.log(result.draft);
    }
};

const printMetrics = (result: EmailSimulationResult) => {
    section('6. METRICS');
    console.log(`runId: ${result.runId ?? '(not saved)'}`);
    for (const metric of result.metrics) {
        const tokens = metric.totalTokens !== undefined
            ? `${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} tokens`
            : 'no token data';
        const calls = metric.callCount > 1 ? ` (${metric.callCount} calls)` : '';
        console.log(`${metric.stage.padEnd(20)} ${metric.provider}/${metric.model}  ${metric.durationMs}ms  ${tokens}${calls}`);
    }
};

const printHumanReadableResult = (result: EmailSimulationResult, args: CliArgs) => {
    section('1. NORMALIZE');
    console.log(result.normalized);

    section('2. DETERMINISTIC SPAM CHECK');
    console.log(result.deterministicSpamReason ? `SPAM (${result.deterministicSpamReason}) — the real pipeline would stop here` : 'not spam');

    printClassification(result);
    printKnowledgeRetrieval(result, args);
    printDraft(result);
    printMetrics(result);
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));
    if (!args.subject) throw new Error('--subject is required');

    const bodyText = await resolveBodyText(args);

    const result = await runEmailAssistantSimulation({
        from: args.from, subject: args.subject, body: bodyText,
        topK: args.topK, noKnowledge: args.noKnowledge, forceDraft: args.forceDraft,
    });

    if (args.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    printHumanReadableResult(result, args);
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
