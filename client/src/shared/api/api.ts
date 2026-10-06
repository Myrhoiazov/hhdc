import { StoreType } from "@/app/providers/StoreProvider";
import axios from "axios";
import { userActions } from "@/entities/User";

let store: StoreType
let csrfToken: string | null = null;

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

const csrfApi = axios.create({
    baseURL: __API__ + '/api/v1',
    withCredentials: true,
});

const isUnsafeMethod = (method?: string) => unsafeMethods.has((method || 'get').toLowerCase());
const isCsrfExempt = (url?: string) =>
    url === '/auth/login' || url === '/auth/csrf' || url === '/auth/refresh' || url === '/auth/logout';

const resetCsrfToken = () => {
    csrfToken = null;
};

const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    const { data } = await csrfApi.get<{ csrfToken: string }>('/auth/csrf');
    csrfToken = data.csrfToken;
    return csrfToken;
};

export const injectStore = (_store: StoreType) => {
    store = _store
}

export const $api = axios.create({
    baseURL: __API__ + '/api/v1',
    withCredentials: true
})

export const $apiPrivate = axios.create({
    baseURL: __API__ + "/api/v1",
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

$apiPrivate.interceptors.request.use(config => {
    if (isUnsafeMethod(config.method) && !isCsrfExempt(config.url)) {
        return getCsrfToken().then((token) => {
            config.headers['X-CSRF-Token'] = token;
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            return config;
        });
    }
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    return config
})

$apiPrivate.interceptors.response.use(
    res => res,
    async error => {
        const originalRequest = error.config;

        if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/csrf') {
            throw error;
        }

        const errorMessage = typeof error.response?.data?.message === 'string'
            ? error.response.data.message
            : '';
        if (
            error.response?.status === 403
            && errorMessage.startsWith('CSRF')
            && error.config
            && !originalRequest._csrfRetry
        ) {
            originalRequest._csrfRetry = true;
            resetCsrfToken();
            delete originalRequest.headers?.['X-CSRF-Token'];
            return $apiPrivate.request(originalRequest);
        }

        if (error.response?.status === 401 && error.config && !originalRequest._isRetry) {
            originalRequest._isRetry = true;

            try {
                const { data } = await $apiPrivate.post('/auth/refresh', undefined, { withCredentials: true });
                if (!data) {
                    throw error
                }
                resetCsrfToken();
                delete originalRequest.headers?.['X-CSRF-Token'];
                store.dispatch(userActions.setAuthData(data))
                return $apiPrivate.request(originalRequest);
            } catch (err) {
                console.log("err: ", err);
            }
        }
        throw error
    }
);

export const csrfActions = {
    reset: resetCsrfToken,
};
