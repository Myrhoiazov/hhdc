import prisma from '../prisma/prisma-client';
import { OllamaLlmClient } from '../src/modules/ai-email-assistant/ollama.client';
import { generateRagV2Draft, type RagV2DraftResult } from '../src/modules/ai-email-assistant/rag-v2/rag-v2-draft.service';
import { createRagV2Deps } from '../src/modules/ai-email-assistant/rag-v2/rag-v2.factory';
import { checkDraft, checkRetrieval, REGRESSION_CASES, type RegressionCase } from '../src/modules/ai-email-assistant/rag-v2/rag-v2.regression';

// Live RAG v2 evaluation against the indexed v2 knowledge base and the local Ollama models
// (no cloud calls). Not part of CI: needs `npm run knowledge:index` and a running Ollama.
//   npm run knowledge:eval [-- <case-id-substring>]

interface CaseReport { id: string; problems: string[]; blocked: boolean; trimmed: string[]; confidence: string; needsStaffReview: boolean; attempts: number; ms: number; draft: string }

const evaluateCase = async (testCase: RegressionCase, deps: ReturnType<typeof createRagV2Deps>, draftClient: OllamaLlmClient): Promise<CaseReport> => {
    const start = Date.now();
    const result: RagV2DraftResult = await generateRagV2Draft({
        email: { fromAddress: 'eval@example.com', subject: '', normalizedBody: testCase.message },
        classification: { spam: false, needsReply: true, language: testCase.llm.language, intent: testCase.llm.intent, confidence: 1, reason: '' },
        contact: null,
        requestId: `eval-${testCase.id}`,
    }, { ...deps, draftClient, log: () => undefined });
    const draftProblems = checkDraft(testCase, result.draft.body);
    // A forbidden claim that the grounding validator caught (draft marked for staff review) is the
    // intended safety outcome, reported as BLOCKED rather than as a failure.
    const blocked = draftProblems.length > 0 && result.trace.needsStaffReview && result.trace.warnings.some((warning) => !warning.startsWith('staff_confirmation'));
    return {
        id: testCase.id,
        problems: [...checkRetrieval(testCase, result.retrieved), ...(blocked ? [] : draftProblems)],
        blocked,
        trimmed: result.trace.trimmedChunkIds,
        confidence: result.trace.confidence,
        needsStaffReview: result.trace.needsStaffReview,
        attempts: result.trace.attempts,
        ms: Date.now() - start,
        draft: result.draft.body,
    };
};

const printReport = (report: CaseReport): void => {
    const status = report.problems.length ? 'FAIL' : report.blocked ? 'BLKD' : 'ok  ';
    console.log(`${status} ${report.id.padEnd(40)} conf=${report.confidence.padEnd(6)} staff=${report.needsStaffReview ? 'y' : 'n'} attempts=${report.attempts} ${report.ms}ms`);
    report.problems.forEach((problem) => console.log(`       - ${problem}`));
    if (report.trimmed.length) console.log(`       ~ trimmed to fit context: ${report.trimmed.join(', ')}`);
    if (process.env.EVAL_VERBOSE === 'true') console.log(`       > ${report.draft.replace(/\n/g, '\n       > ')}`);
};

const main = async (): Promise<void> => {
    const filter = process.argv[2] ?? '';
    const cases = REGRESSION_CASES.filter((testCase) => testCase.id.includes(filter));
    const deps = createRagV2Deps();
    const draftClient = new OllamaLlmClient();
    const reports: CaseReport[] = [];
    for (const testCase of cases) {
        const report = await evaluateCase(testCase, deps, draftClient);
        printReport(report);
        reports.push(report);
    }
    const failed = reports.filter((report) => report.problems.length).length;
    console.log(`\n${reports.length - failed}/${reports.length} cases passed (${reports.filter((report) => report.blocked).length} blocked by validator); staff review: ${reports.filter((report) => report.needsStaffReview).length}`);
    if (failed) process.exitCode = 1;
};

main()
    .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
    .finally(() => prisma.$disconnect().catch((): void => undefined));
