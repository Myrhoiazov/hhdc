import { Request } from 'express';
import { exportPersonData, anonymizePerson } from './privacy.service';
import { currentUser } from '../auth/auth.middleware';

export async function exportData(req: Request) {
  const { personId } = req.params;
  const data = await exportPersonData(personId);
  return { data };
}

export async function anonymize(req: Request) {
  const { personId } = req.params;
  const user = currentUser(req);
  const actorUserId = user?.id; 
  const result = await anonymizePerson(personId, actorUserId);
  return { data: result };
}
