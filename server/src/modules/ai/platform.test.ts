import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ApiError } from '../../common/http';
import { allowedKnowledgeVisibility } from '../knowledge/visibility';
import { plannerPrompt } from './assistant.service';
import { PROPOSAL_SCHEMAS, assertConfirmable } from './proposals';
import { AI_TOOLS, AiTool, availableTools, runTool } from './tools';

const code = (expected: string) => (error: unknown) => error instanceof ApiError && error.code === expected;
const names = (tools: AiTool[]) => tools.map(tool => tool.name);

test('the assistant only sees tools the user is permitted to use', () => {
    const support = availableTools(['people.read', 'events.read']);
    assert.equal(names(support).includes('search_people'), true);
    assert.equal(names(support).includes('get_event_financial_summary'), false);
    assert.equal(names(availableTools(['finance.read'])).join(), 'get_event_financial_summary');
    assert.deepEqual(availableTools([]), []);
});

test('a tool outside the user permissions cannot be run even if the model asks for it', async () => {
    await assert.rejects(runTool('get_event_financial_summary', { id: '11111111-1111-4111-8111-111111111111' }, ['people.read']), /not available/);
    await assert.rejects(runTool('run_sql', { sql: 'select 1' }, AI_TOOLS.map(tool => tool.permission)), /not available/);
});

test('tool arguments are validated and no tool accepts free-form SQL', async () => {
    const tool: AiTool = { name: 'echo', description: '', permission: 'people.read', args: z.object({ id: z.string().uuid() }).strict(), run: async args => args };
    assert.throws(() => tool.args.parse({ id: 'x; DROP TABLE' }));
    for (const candidate of AI_TOOLS) assert.equal(candidate.args.safeParse({ sql: 'select 1' }).success, false, candidate.name);
});

test('finance knowledge is retrievable only with finance permission and private knowledge never', () => {
    assert.deepEqual(allowedKnowledgeVisibility(['knowledge.read']), ['PUBLIC_OPERATIONAL', 'INTERNAL']);
    assert.equal(allowedKnowledgeVisibility(['finance.read']).includes('FINANCE'), true);
    assert.equal(allowedKnowledgeVisibility(['finance.read', 'ai.manage']).includes('PRIVATE' as never), false);
});

test('the planner prompt offers action proposals only when the user may propose', () => {
    assert.match(plannerPrompt([], true), /proposedAction/);
    assert.doesNotMatch(plannerPrompt([], false), /proposedAction/);
});

test('a proposal can be confirmed only by its owner, once, before it expires', () => {
    const now = new Date('2027-01-01T10:00:00Z');
    const pending = { userId: 'u1', status: 'PENDING' as const, expiresAt: new Date('2027-01-01T10:05:00Z') };
    assert.doesNotThrow(() => assertConfirmable(pending, 'u1', now));
    assert.throws(() => assertConfirmable(pending, 'u2', now), code('PROPOSAL_NOT_OWNED'));
    assert.throws(() => assertConfirmable({ ...pending, status: 'EXECUTED' }, 'u1', now), code('PROPOSAL_NOT_PENDING'));
    assert.throws(() => assertConfirmable({ ...pending, expiresAt: now }, 'u1', now), code('PROPOSAL_EXPIRED'));
});

test('proposal payloads are strictly validated', () => {
    assert.equal(PROPOSAL_SCHEMAS.CREATE_TASK.parse({ title: 'Call Anna' }).priority, 'NORMAL');
    assert.throws(() => PROPOSAL_SCHEMAS.CREATE_TASK.parse({ title: 'x', assigneeId: 'someone-else' }));
});
