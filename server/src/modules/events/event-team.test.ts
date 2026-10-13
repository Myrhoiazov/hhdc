import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payOf, roleToGrant, teamMemberChangeSchema, teamMemberSchema } from './event-team';

const PERSON = '7b0e0f0a-5a0e-4d57-9c1c-0c5a3d1f2a11';

test('a team member needs a person and a role; staff is assumed and pay is optional', () => {
    const parsed = teamMemberSchema.parse({ personId: PERSON, roleTitle: '  Videographer ' });
    assert.deepEqual([parsed.roleTitle, parsed.personRole, parsed.amount, parsed.currency], ['Videographer', 'STAFF', undefined, 'EUR']);
    for (const bad of [{ personId: PERSON }, { personId: PERSON, roleTitle: ' ' }, { roleTitle: 'Admin' }, { personId: PERSON, roleTitle: 'Admin', personRole: 'CUSTOMER' }]) {
        assert.throws(() => teamMemberSchema.parse(bad), JSON.stringify(bad));
    }
});

test('the pay of a role is a positive amount; a comma is read as a decimal point', () => {
    assert.equal(teamMemberSchema.parse({ personId: PERSON, roleTitle: 'Admin', amount: '1200,50', personRole: 'PARTNER' }).amount, '1200.50');
    assert.throws(() => teamMemberSchema.parse({ personId: PERSON, roleTitle: 'Admin', amount: '0' }));
});

test('a change touches only what it names and cannot move the role to another person', () => {
    assert.deepEqual(teamMemberChangeSchema.parse({ duties: 'Films the show' }), { duties: 'Films the show' });
    assert.throws(() => teamMemberChangeSchema.parse({ personId: PERSON }));
    assert.throws(() => teamMemberChangeSchema.parse({ roleTitle: '' }));
});

test('joining a team gives the chosen role only to somebody who is neither staff nor a partner yet', () => {
    assert.equal(roleToGrant(['CUSTOMER'], 'PARTNER'), 'PARTNER');
    assert.equal(roleToGrant([], 'STAFF'), 'STAFF');
    assert.equal(roleToGrant(['STAFF'], 'PARTNER'), null);
    assert.equal(roleToGrant(['CHOREOGRAPHER', 'PARTNER'], 'STAFF'), null);
});

test('what a role costs is the sum of its expenses: paid, still to pay, cancelled left out', () => {
    const expense = (amount: string, status: string) => ({ amount, currency: 'EUR', status });
    assert.deepEqual(payOf([expense('500.00', 'PAID'), expense('700.00', 'PLANNED'), expense('300.00', 'CANCELLED')]), { total: '1200.00', paid: '500.00', planned: '700.00', currency: 'EUR' });
    assert.deepEqual(payOf([]), { total: '0.00', paid: '0.00', planned: '0.00', currency: 'EUR' });
});
