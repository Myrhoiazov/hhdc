import { Router } from 'express';
import { route } from '../../common/http';
import * as privacyController from './privacy.controller';
import { permitted } from '../auth/auth.middleware';

export const privacyRouter = Router();

// Privacy operations are usually highly restricted
privacyRouter.post('/export/:personId', permitted('privacy.export'), route(privacyController.exportData));
privacyRouter.post('/anonymize/:personId', permitted('privacy.anonymize'), route(privacyController.anonymize));
