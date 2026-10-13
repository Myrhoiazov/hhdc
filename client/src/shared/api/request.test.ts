import { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { $apiPrivate, csrfActions } from './api';
import { deleteData, patchData, postData, putData, readData, readPage } from './request';

const calls: InternalAxiosRequestConfig[] = [];
const answerWith = (data: unknown): AxiosAdapter => async config => {
    calls.push(config);
    return { config, status: 200, data, statusText: '', headers: {} } as AxiosResponse;
};
const lastCall = () => calls[calls.length - 1];

beforeEach(() => {
    calls.length = 0;
    // A known token keeps the changing requests from asking the server for one.
    csrfActions.set('token');
});

test('reading gives what the server wrapped in `data`', async () => {
    $apiPrivate.defaults.adapter = answerWith({ data: { id: '1' } });

    await expect(readData<{ id: string }>('/events/1')).resolves.toEqual({ id: '1' });
    expect(lastCall().method).toBe('get');
    expect(lastCall().url).toBe('/events/1');
});

test('a page comes with the total the server counted', async () => {
    $apiPrivate.defaults.adapter = answerWith({ data: [{ id: '1' }], meta: { total: 40 } });

    await expect(readPage<{ id: string }>('/events?page=2')).resolves.toEqual({ data: [{ id: '1' }], total: 40 });
});

test.each([
    ['post', postData],
    ['patch', patchData],
    ['put', putData],
] as const)('%s sends the body and gives the answer of the server', async (method, send) => {
    $apiPrivate.defaults.adapter = answerWith({ data: { id: '1', name: 'Camp' } });

    await expect(send<{ id: string }>('/events', { name: 'Camp' })).resolves.toEqual({ id: '1', name: 'Camp' });
    expect(lastCall().method).toBe(method);
    expect(JSON.parse(lastCall().data)).toEqual({ name: 'Camp' });
});

test('a deletion gives the answer of the server and can carry a body', async () => {
    $apiPrivate.defaults.adapter = answerWith({ data: { unlinked: true } });

    await expect(deleteData<{ unlinked: boolean }>('/links/1', { data: { note: 'wrong person' } })).resolves.toEqual({ unlinked: true });
    expect(lastCall().method).toBe('delete');
    expect(JSON.parse(lastCall().data)).toEqual({ note: 'wrong person' });
});
