import { Router } from 'express';
import { z } from 'zod';
import { currentUser, permitted } from '../auth/auth.middleware';
import { crmLink } from '../telegram-notifications/crm-link';
import { announce } from '../telegram-notifications/announce';
import { createEventExpense, deleteEventExpense, expenseChangeSchema, expenseSchema, listEventExpenses, updateEventExpense } from '../finance/event-expenses';
import { route } from '../../common/http';
import * as controller from './events.controller';
import { addTeamMember, listEventTeam, RecordHistory, removeTeamMember, TeamActor, teamMemberChangeSchema, teamMemberSchema, updateTeamMember } from './event-team';
import { recordHistory } from '../audit/audit.service';
import { Request } from 'express';
import { entityId } from '../../common/http';
import { getEventSales } from '../ticketing/event-sales';
import { listTicketTypes } from '../ticketing/weeztix-catalog.service';

export const eventsRouter = Router();

eventsRouter.get('/', permitted('events.read'), async (req, res, next) => { try { await controller.listEvents(req); } catch (e) { next(e); } });
eventsRouter.post('/', permitted('events.write'), route(controller.createEvent));
eventsRouter.patch('/:id', permitted('events.write'), route(controller.updateEvent));
eventsRouter.get('/:id', permitted('events.read'), route(controller.getEvent));

eventsRouter.get('/:id/ticket-types', permitted('events.read'), route(async req => listTicketTypes(entityId(req))));
eventsRouter.get('/:id/sales', permitted('finance.read'), route(async req => getEventSales(entityId(req))));

eventsRouter.get('/:id/sessions', permitted('events.read'), route(controller.listSessions));
eventsRouter.post('/:id/sessions', permitted('events.write'), route(controller.createSession));
eventsRouter.patch('/:id/sessions/:sessionId', permitted('events.write'), route(controller.updateSession));
// The costs of the event: seen by staff who may see finance, changed by those who also manage events.
eventsRouter.get('/:id/expenses', permitted('finance.read'), route(async req => listEventExpenses(entityId(req))));
eventsRouter.post('/:id/expenses', permitted('finance.read'), permitted('events.write'), route(async req => {
    req.res!.status(201);
    const expense = await createEventExpense(entityId(req), expenseSchema.parse(req.body), currentUser(req).id);
    void announce('EVENT_EXPENSE_ADDED', { category: expense.category, amount: expense.amount, currency: expense.currency, event: expense.event?.name ?? '', link: crmLink('/finance') });
    return expense;
}));
eventsRouter.patch('/:id/expenses/:expenseId', permitted('finance.read'), permitted('events.write'), route(async req => {
    const expenseId = z.string().uuid().parse(req.params.expenseId);
    return updateEventExpense({ eventId: entityId(req), expenseId }, expenseChangeSchema.parse(req.body), currentUser(req).id);
}));
eventsRouter.delete('/:id/expenses/:expenseId', permitted('finance.read'), permitted('events.write'), route(async req => {
    const expenseId = z.string().uuid().parse(req.params.expenseId);
    return deleteEventExpense({ eventId: entityId(req), expenseId }, currentUser(req).id);
}));

eventsRouter.get('/:id/registrations', permitted('events.read'), async (req, res, next) => { try { await controller.listRegistrations(req); } catch (e) { next(e); } });
eventsRouter.post('/:id/registrations', permitted('events.write'), route(controller.createRegistration));
eventsRouter.post('/:id/choreographers', permitted('events.write'), route(controller.assignChoreographer));

// The team of the event. Anyone who sees the event sees who works on it; what they are paid is
// shown to, and entered by, only those who may see finance.
const teamActor = (req: Request): TeamActor => ({ userId: currentUser(req).id, seesMoney: currentUser(req).permissions.includes('finance.read') });
const historyOf = (req: Request): RecordHistory => (tx, input) => recordHistory(tx, req, input);
const teamMemberRef = (req: Request) => ({ eventId: entityId(req), memberId: z.string().uuid().parse(req.params.memberId) });

eventsRouter.get('/:id/team', permitted('events.read'), route(async req => listEventTeam(entityId(req), teamActor(req).seesMoney)));
eventsRouter.post('/:id/team', permitted('events.write'), route(async req => {
    req.res!.status(201);
    return addTeamMember(entityId(req), teamMemberSchema.parse(req.body), teamActor(req), historyOf(req));
}));
eventsRouter.patch('/:id/team/:memberId', permitted('events.write'), route(async req => updateTeamMember(teamMemberRef(req), teamMemberChangeSchema.parse(req.body), teamActor(req), historyOf(req))));
eventsRouter.delete('/:id/team/:memberId', permitted('events.write'), route(async req => removeTeamMember(teamMemberRef(req), historyOf(req))));
