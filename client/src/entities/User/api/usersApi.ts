import { $apiPrivate } from '@/shared/api/api';
import { readPage } from '@/shared/api/request';

export const listUsers = async () =>
    readPage<{
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        roles: { role: { key: string } }[];
    }>('/users');

export const createUser = async (input: {
    name: string;
    email: string;
    password: string;
    roles: string[];
}) => $apiPrivate.post('/users', input);

export const updateUser = async (id: string, input: { isActive: boolean }) =>
    $apiPrivate.patch(`/users/${id}`, input);
