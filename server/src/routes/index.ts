import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { authenticated } from '../modules/auth/auth.middleware';
import { providersRouter } from '../modules/providers/providers.routes';
// Existing CRM routes (assuming they remain in crm for now)
import { peopleRouter } from '../modules/people/people.routes';
import { eventsRouter } from '../modules/events/events.routes';
import { adminRouter } from '../modules/crm/admin';
import { ticketingRouter } from '../modules/ticketing/ticketing.routes';
import { communicationsRouter } from '../modules/communications/routes';
import { knowledgeRouter } from '../modules/knowledge/routes';
import { aiRouter } from '../modules/ai/routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { searchRouter } from '../modules/search/search.routes';
import { privacyRouter } from '../modules/privacy/privacy.routes';

const router = Router();
router.use('/auth', authRouter);
router.use(authenticated);
router.use('/dashboard', dashboardRouter);
router.use('/search', searchRouter);
router.use('/privacy', privacyRouter);
router.use('/people', peopleRouter);
router.use('/events', eventsRouter);
router.use('/providers', providersRouter);
router.use('/conversations', communicationsRouter);
router.use('/knowledge', knowledgeRouter);
router.use(aiRouter);
router.use(ticketingRouter);
router.use(adminRouter);

export default router;
