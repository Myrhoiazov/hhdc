import { $apiPrivate } from './api';

// One page of a list and how many rows the whole list has.
export interface PageResult<T> {
    data: T[];
    total: number;
}

// The server wraps every answer in `data`; a list adds `meta.total`.
interface Envelope<T> {
    data: T;
}
interface PageEnvelope<T> {
    data: T[];
    meta: { total: number };
}

export const readData = async <T>(path: string) => (await $apiPrivate.get<Envelope<T>>(path)).data.data;

export const readPage = async <T>(path: string): Promise<PageResult<T>> => {
    const result = (await $apiPrivate.get<PageEnvelope<T>>(path)).data;
    return { data: result.data, total: result.meta.total };
};

export const postData = async <T>(path: string, body?: unknown) =>
    (await $apiPrivate.post<Envelope<T>>(path, body)).data.data;

export const patchData = async <T>(path: string, body?: unknown) =>
    (await $apiPrivate.patch<Envelope<T>>(path, body)).data.data;

export const putData = async <T>(path: string, body?: unknown) =>
    (await $apiPrivate.put<Envelope<T>>(path, body)).data.data;
