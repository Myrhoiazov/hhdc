import { AxiosAdapter, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { $api, $apiPrivate, csrfActions, setUnauthorizedHandler } from './api';

const respond = (
    config: InternalAxiosRequestConfig,
    status: number,
    data: unknown = {}
): AxiosResponse => ({ config, status, data, statusText: '', headers: {} });
const refuse =
    (status: number, data: unknown = {}): AxiosAdapter =>
    async (config) => {
        throw new AxiosError(
            'Request failed',
            String(status),
            config,
            undefined,
            respond(config, status, data)
        );
    };
const accept: AxiosAdapter = async (config) => respond(config, 200);

let tokenRequests = 0;
const giveToken: AxiosAdapter = async (config) => {
    tokenRequests += 1;
    return respond(config, 200, { data: { csrfToken: `token-${tokenRequests}` } });
};

beforeEach(() => {
    tokenRequests = 0;
    csrfActions.reset();
    setUnauthorizedHandler(undefined);
    $api.defaults.adapter = giveToken;
    $apiPrivate.defaults.adapter = accept;
});

test('a 401 answer calls the handler given by the application', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    $apiPrivate.defaults.adapter = refuse(401);

    await expect($apiPrivate.get('/people')).rejects.toBeInstanceOf(AxiosError);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test('a 401 answer forgets the CSRF token, so the next change asks for a new one', async () => {
    await $apiPrivate.post('/people', {});
    expect(tokenRequests).toBe(1);

    $apiPrivate.defaults.adapter = refuse(401);
    await expect($apiPrivate.get('/people')).rejects.toBeInstanceOf(AxiosError);
    $apiPrivate.defaults.adapter = accept;
    const result = await $apiPrivate.post('/people', {});

    expect(tokenRequests).toBe(2);
    expect(result.config.headers['X-CSRF-Token']).toBe('token-2');
});

test('another refusal leaves the session alone and carries the reason of the server', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    $apiPrivate.defaults.adapter = refuse(400, { error: { message: 'Amount must be positive' } });

    await expect($apiPrivate.get('/people')).rejects.toThrow('Amount must be positive');

    expect(onUnauthorized).not.toHaveBeenCalled();
});

test('a 401 answer without a handler is still rejected', async () => {
    $apiPrivate.defaults.adapter = refuse(401);

    await expect($apiPrivate.get('/people')).rejects.toBeInstanceOf(AxiosError);
});
