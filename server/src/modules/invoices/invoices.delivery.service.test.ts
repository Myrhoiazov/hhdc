import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceDeliveryType } from '@prisma/client';
import { resolveDueReminderType } from './invoices.delivery.service';

const now = new Date(2026, 7, 5, 12, 0, 0);
const inThreeDays = new Date(2026, 7, 8, 12, 0, 0);

test('resolveDueReminderType is overdue when the due date is in the past', () => {
    const dueDate = new Date(2026, 7, 1);
    assert.equal(resolveDueReminderType(dueDate, now, inThreeDays), InvoiceDeliveryType.REMINDER_OVERDUE);
});

test('resolveDueReminderType is before-due when the due date falls within the reminder window', () => {
    const dueDate = new Date(2026, 7, 6);
    assert.equal(resolveDueReminderType(dueDate, now, inThreeDays), InvoiceDeliveryType.REMINDER_BEFORE_DUE);
});

test('resolveDueReminderType includes the window boundary (due date exactly at inThreeDays)', () => {
    assert.equal(resolveDueReminderType(inThreeDays, now, inThreeDays), InvoiceDeliveryType.REMINDER_BEFORE_DUE);
});

test('resolveDueReminderType is null when the due date is further out than the window', () => {
    const dueDate = new Date(2026, 7, 20);
    assert.equal(resolveDueReminderType(dueDate, now, inThreeDays), null);
});
