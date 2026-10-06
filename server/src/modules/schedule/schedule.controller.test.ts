import assert from 'node:assert/strict';
import test from 'node:test';
import { fromPartial } from '@total-typescript/shoehorn';
import {
    buildBranchStats,
    buildGroupStats,
    resolveSubscriptionState,
    studentSummary,
} from './schedule.controller';

type ManagementBranches = Parameters<typeof buildBranchStats>[0];
type Student = Parameters<typeof studentSummary>[0];
type BillingCustomer = Parameters<typeof resolveSubscriptionState>[0][number];

const activeSubscriptionCustomer: BillingCustomer = { subscriptions: [{ status: 'active' }], mandates: [{ id: 1 }] };
const stoppedSubscriptionCustomer: BillingCustomer = { subscriptions: [{ status: 'canceled' }], mandates: [{ id: 2 }] };
const noMollieCustomer: BillingCustomer = { subscriptions: [], mandates: [] };

const activeStudent: Student = {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phoneNumber: null,
    mollieCustomers: [activeSubscriptionCustomer],
    mollieLinks: [],
};

const inactiveStudent: Student = {
    id: 2,
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@example.com',
    phoneNumber: null,
    mollieCustomers: [],
    mollieLinks: [{ customer: stoppedSubscriptionCustomer }],
};

const unbilledStudent: Student = {
    id: 3,
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan@example.com',
    phoneNumber: null,
    mollieCustomers: [],
    mollieLinks: [],
};

test('resolveSubscriptionState is active when any linked customer has an active subscription', () => {
    assert.equal(resolveSubscriptionState([stoppedSubscriptionCustomer, activeSubscriptionCustomer]), 'active');
});

test('resolveSubscriptionState is inactive when there is a mandate but no active subscription', () => {
    assert.equal(resolveSubscriptionState([stoppedSubscriptionCustomer]), 'inactive');
    assert.equal(resolveSubscriptionState([{ subscriptions: [], mandates: [{ id: 3 }] }]), 'inactive');
});

test('resolveSubscriptionState is none without mandate and active subscription', () => {
    assert.equal(resolveSubscriptionState([]), 'none');
    assert.equal(resolveSubscriptionState([noMollieCustomer]), 'none');
});

test('studentSummary merges direct and linked customers and hides Mollie data', () => {
    const result = studentSummary(inactiveStudent);
    assert.equal(result.subscriptionState, 'inactive');
    assert.equal(result.isActive, false);
    assert.equal(result.firstName, 'Grace');
    assert.equal('mollieLinks' in result, false);
    assert.equal('mollieCustomers' in result, false);
});

const branches: ManagementBranches = fromPartial([
    {
        id: 10,
        name: 'Amsterdam',
        city: 'Amsterdam',
        address: 'Main St 1',
        isActive: true,
        clients: [activeStudent, inactiveStudent, unbilledStudent],
        groups: [
            {
                id: 100,
                name: 'Hip-hop kids',
                maxParticipants: 12,
                clientMemberships: [
                    { clientId: 1, client: activeStudent },
                ],
            },
        ],
    },
]);

test('buildBranchStats counts active/inactive students, capacity, and unassigned students', () => {
    const [stats] = buildBranchStats(branches);

    assert.equal(stats.id, 10);
    assert.equal(stats.groupCount, 1);
    assert.equal(stats.capacity, 12);
    assert.equal(stats.activeCount, 1);
    assert.equal(stats.inactiveCount, 1);
    assert.deepEqual(stats.activeStudents.map((student) => student.id), [1]);
    assert.deepEqual(stats.inactiveStudents.map((student) => student.id), [2]);
    // students 2 and 3 have no group membership -> unassigned
    assert.equal(stats.unassignedCount, 2);
});

test('buildBranchStats sums capacity across multiple groups and reports zero unassigned when everyone is in a group', () => {
    const branchesWithTwoGroups: ManagementBranches = fromPartial([
        {
            id: 11,
            name: 'Rotterdam',
            city: 'Rotterdam',
            address: 'Side St 2',
            isActive: true,
            clients: [activeStudent, inactiveStudent],
            groups: [
                { id: 200, name: 'A', maxParticipants: 10, clientMemberships: [{ clientId: 1, client: activeStudent }] },
                { id: 201, name: 'B', maxParticipants: 8, clientMemberships: [{ clientId: 2, client: inactiveStudent }] },
            ],
        },
    ]);

    const [stats] = buildBranchStats(branchesWithTwoGroups);

    assert.equal(stats.capacity, 18);
    assert.equal(stats.unassignedCount, 0);
});

test('buildGroupStats reports per-group active/inactive/total counts', () => {
    const groupsWithMixedMembership: ManagementBranches = fromPartial([
        {
            id: 12,
            name: 'Utrecht',
            groups: [
                {
                    id: 300,
                    name: 'Mixed group',
                    maxParticipants: 20,
                    clientMemberships: [
                        { clientId: 1, client: activeStudent },
                        { clientId: 2, client: inactiveStudent },
                        { clientId: 3, client: unbilledStudent },
                    ],
                },
            ],
        },
    ]);

    const [group] = buildGroupStats(groupsWithMixedMembership);

    assert.equal(group.id, 300);
    assert.equal(group.branchId, 12);
    assert.equal(group.activeCount, 1);
    assert.equal(group.inactiveCount, 1);
    assert.equal(group.totalCount, 2);
    assert.deepEqual(group.inactiveStudents.map((student) => student.id), [2]);
});
