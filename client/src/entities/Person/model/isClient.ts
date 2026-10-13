import { Person } from './types';

// A client is a person with at least one purchase.
export const isClient = (person?: Person | null): boolean => (person?._count?.orders ?? 0) > 0;
