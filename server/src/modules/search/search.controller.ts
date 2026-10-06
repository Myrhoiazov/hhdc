import { Request } from 'express';
import { globalSearch } from './search.service';

export async function search(req: Request) {
  const q = req.query.q as string;
  const results = await globalSearch(q);
  return { data: results };
}
