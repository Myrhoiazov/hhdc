import { readData } from '@/shared/api/request';
import { PersonOrder } from '../model/types';

export const listPersonOrders = async (personId: string) =>
    readData<PersonOrder[]>(`/people/${personId}/orders`);
