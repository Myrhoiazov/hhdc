import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EmailClassification } from '../email-classification';
import type { CrmContext, DraftContext, DraftLlmClient } from '../email-draft.types';
import { buildDeterministicDraft, buildDraftBodyPrompt } from '../email-llm';
import { toFallbackFact } from '../email-assistant';
import { retrieveLayeredKnowledge } from './layered-retriever';
import { understandQuery } from './query-understanding';
import { generateRagV2Draft, type RagV2DraftDeps } from './rag-v2-draft.service';
import { buildRetrievalPlan, type RetrievalPlan } from './retrieval-planner';
import { classified, createKnowledgeStore, CURRENT_EVENT_YEAR, DEFAULT_TEST_LIMITS, fakeEmbeddings, FIXED_NOW } from './rag-v2.testHelpers';

const retrieve = (query: string, plan: RetrievalPlan) => retrieveLayeredKnowledge(query, plan, { embeddings: fakeEmbeddings, store: createKnowledgeStore(), now: FIXED_NOW });

const retrieveFor = (body: string, classification: EmailClassification) => {
    const understanding = understandQuery({ subject: '', body, classification, currentEventYear: CURRENT_EVENT_YEAR });
    return retrieve(body, buildRetrievalPlan(understanding, DEFAULT_TEST_LIMITS));
};

// Replies with a fixed body per attempt and records the prompts it was given.
const scriptedClient = (bodies: string[]): DraftLlmClient & { prompts: string[] } => {
    const prompts: string[] = [];
    return {
        prompts,
        contextLength: 8192,
        generateDraft: async (context: DraftContext) => {
            prompts.push(buildDraftBodyPrompt('You answer for HHDC in {{replyLanguage}}.', context));
            return buildDeterministicDraft(context, bodies[Math.min(prompts.length, bodies.length) - 1]);
        },
    };
};

const draftFor = (body: string, classification: EmailClassification, client: DraftLlmClient, extra: Partial<RagV2DraftDeps> = {}) => generateRagV2Draft(
    { email: { fromAddress: 'anna@example.test', subject: 'Question', normalizedBody: body }, classification, contact: null },
    { draftClient: client, retrieve, limits: DEFAULT_TEST_LIMITS, currentEventYear: CURRENT_EVENT_YEAR, characterBudget: 20_000, log: () => undefined, ...extra },
);

const ids = (chunks: Array<{ documentId: string }>) => chunks.map(chunk => chunk.documentId);

test('a 2027 price question gets the 2027 ticket card and no competition or legacy facts', async () => {
    const knowledge = await retrieveFor('How much is the Early Bird Full Pass for HHDC 2027?', classified('pricing'));
    assert.equal(knowledge.facts[0].documentId, 'ticket_full_pass_2027');
    assert.ok(knowledge.facts.every(chunk => chunk.metadata.eventYear === undefined || chunk.metadata.eventYear === 2027));
    assert.ok(!ids(knowledge.facts).includes('competition_2026_legacy'));
    assert.deepEqual(ids(knowledge.examples), ['ex_early_bird_en']);
});

test('2026 competition fees never answer a 2027 question, but do answer a 2026 one', async () => {
    const current = await retrieveFor('How much is Solo competition in 2027?', classified('competition'));
    assert.deepEqual(current.facts, []);
    assert.deepEqual(ids(current.faq), ['faq_competition']);
    assert.ok(ids(current.rules).includes('year_separation'));

    const past = await retrieveFor('What were the Solo fees in 2026?', classified('competition'));
    assert.deepEqual(ids(past.facts), ['competition_2026_legacy']);
    assert.deepEqual(past.faq, []);
});

test('examples are offered only in the language of the reply; developer notes are never indexed', async () => {
    const russian = await retrieveFor('Сколько стоит билет Early Bird?', classified('pricing', { replyLanguage: 'ru' }));
    assert.deepEqual(ids(russian.examples), ['ex_early_bird_ru']);
    const chunks = await createKnowledgeStore().listActiveChunks();
    assert.ok(chunks.every(chunk => !/retrieval_guide|intents|bad_examples|kb_root/.test(chunk.metadata.documentId)));
    assert.ok(chunks.some(chunk => chunk.metadata.documentId === 'answerability' && chunk.metadata.priority === 'rules'));
});

test('an answerable question yields a grounded draft with the tagged context and its sources', async () => {
    const client = scriptedClient(['Hi! The Early Bird Full Pass is currently €390.']);
    const result = await draftFor('How much is the Early Bird Full Pass for HHDC 2027?', classified('pricing'), client);

    assert.match(client.prompts[0], /<classification>[\s\S]*<customer_email>[\s\S]*<crm_data>[\s\S]*<knowledge>[\s\S]*CURRENT FACTS[\s\S]*TASK/);
    assert.match(client.prompts[0], /status published_with_date_conflicts/);
    assert.equal(result.trace.attempts, 1);
    assert.equal(result.trace.answerability, 'ANSWERABLE');
    // The ticket page is published with a known conflict: confidence is capped and staff look at it.
    assert.ok(result.draft.confidence <= 0.69);
    assert.ok(result.trace.warnings.includes('source_needs_verification'));
    assert.ok(result.trace.usedKnowledge.some(item => item.documentId === 'ticket_full_pass_2027'));
});

test('a settled fact gives a confident draft that needs no extra review', async () => {
    const result = await draftFor('Where will HHDC 2027 take place?', classified('venue'), scriptedClient(['Hi! HHDC 2027 takes place at Apollohal, Amsterdam.']));
    assert.equal(result.trace.answerability, 'ANSWERABLE');
    assert.equal(result.trace.confidence, 'high');
    assert.equal(result.trace.needsStaffReview, false);
});

test('an invented price is regenerated once and then handed to staff', async () => {
    const invented = 'Hi! The Solo competition fee for 2027 is €4321.';
    const client = scriptedClient([invented, invented]);
    const result = await draftFor('How much is Solo competition in 2027?', classified('competition'), client);

    assert.equal(client.prompts.length, 2);
    assert.match(client.prompts[1], /CORRECTION: your previous draft was rejected/);
    assert.equal(result.trace.answerability, 'HUMAN_REQUIRED');
    assert.equal(result.trace.needsStaffReview, true);
    assert.ok(result.trace.warnings.some(warning => warning.startsWith('ungrounded_price')));
});

test('a refund is drafted for staff and a claim that it was done is rejected', async () => {
    const client = scriptedClient(['Hi! Your ticket has been refunded.', 'Hi! Thank you for your message. Our team will review your refund request and get back to you.']);
    const result = await draftFor('I want my money back for my ticket.', classified('refund'), client, { loadCrm: async () => ({ found: false, text: '' }) });

    assert.equal(client.prompts.length, 2);
    assert.match(client.prompts[0], /This request needs staff action/);
    assert.equal(result.trace.answerability, 'HUMAN_REQUIRED');
    assert.equal(result.trace.needsCRM, true);
    assert.equal(result.trace.crmFound, false);
    assert.ok(result.trace.warnings.includes('staff_action_required'));
    assert.match(result.draft.body, /will review your refund request/);
});

test('CRM data is fetched only when the email is about the customer and then counts as evidence', async () => {
    let lookups = 0;
    const crm: CrmContext = { found: true, text: '{"payments":[{"amount":"390.00 EUR","paymentStatus":"PAID"}]}' };
    const loadCrm = async () => { lookups += 1; return crm; };

    await draftFor('Where will HHDC 2027 take place?', classified('venue'), scriptedClient(['Hi! Apollohal, Amsterdam.']), { loadCrm });
    assert.equal(lookups, 0);

    const client = scriptedClient(['Hi! We can see your payment of €390 in our system.']);
    const result = await draftFor('Can you confirm you received my payment?', classified('payment', { needsCRM: true }), client, { loadCrm });
    assert.equal(lookups, 1);
    assert.match(client.prompts[0], /<crm_data>\n\{"payments"/);
    assert.equal(result.trace.crmFound, true);
    assert.ok(!result.trace.warnings.some(warning => warning.startsWith('ungrounded_price')));
});

test('a customer-specific question without a CRM record is marked CRM required', async () => {
    const result = await draftFor('Can you confirm I am registered?', classified('registration', { needsCRM: true }), scriptedClient(['Hi! Our team will check your registration and confirm.']), { loadCrm: async () => ({ found: false, text: '' }) });
    assert.equal(result.trace.answerability, 'CRM_REQUIRED');
    assert.ok(result.trace.warnings.includes('crm_record_not_found'));
    assert.equal(result.trace.needsStaffReview, true);
});

test('a plain CRM document can stand in as a fact when the layered corpus has nothing', () => {
    const fact = toFallbackFact({ id: 'chunk-1', documentId: 'doc-1', title: 'Parking', content: 'Free parking behind the venue.', score: 0.4 });
    assert.equal(fact.content, '[Parking] Free parking behind the venue.');
    assert.equal(fact.metadata.priority, 'factual');
});
