import axios from 'axios';

// What the application does when the server no longer knows the session. The application gives it
// (see `createReduxStore`): this layer knows neither the store nor the user.
let onUnauthorized: (() => void) | undefined;
let csrfToken: string | null = null;
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
export const setUnauthorizedHandler = (handler: (() => void) | undefined) => { onUnauthorized = handler; };
export const csrfActions = {
    reset: () => { csrfToken = null; },
    set: (token: string) => { csrfToken = token; },
};
export const $api = axios.create({ baseURL: `${__API__}/api/v1`, withCredentials: true });
export const $apiPrivate = axios.create({ baseURL: `${__API__}/api/v1`, withCredentials: true });
$apiPrivate.interceptors.request.use(async config => {
    if (unsafeMethods.has((config.method || 'get').toLowerCase())) {
        if (!csrfToken) {
            const result = await $api.get<{ data: { csrfToken: string } }>('/auth/me');
            csrfToken = result.data.data.csrfToken;
        }
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});
$apiPrivate.interceptors.response.use(response => response, error => {
    if (error.response?.status === 401) { csrfActions.reset(); onUnauthorized?.(); }
    // The server explains a refusal in `error.message`. Screens show `cause.message`, so the reason
    // replaces the generic "Request failed with status code 400".
    const reason = error.response?.data?.error?.message;
    if (typeof reason === 'string' && reason) error.message = reason;
    return Promise.reject(error);
});
