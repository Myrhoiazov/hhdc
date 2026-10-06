import { Request } from 'express';
import { getSummaryStats } from './dashboard.service';

export async function getDashboardSummary(req: Request) {
  const stats = await getSummaryStats();
  return { data: stats };
}
