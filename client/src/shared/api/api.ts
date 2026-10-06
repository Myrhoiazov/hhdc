import axios from 'axios';
import type { StoreType } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';

let store: StoreType;
let csrfToken: string | null = null;
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
export const injectStore = (nextStore: StoreType) => { store = nextStore; };
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
    if (error.response?.status === 401) { csrfActions.reset(); store?.dispatch(userActions.logout()); }
    return Promise.reject(error);
});
