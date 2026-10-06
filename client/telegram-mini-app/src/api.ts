import { telegramInitData } from './telegram';

interface ApiFailureBody {
    message?: string;
    details?: { fieldErrors?: Record<string, string[]> };
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly fieldErrors: Record<string, string[]> = {},
    ) {
        super(message);
    }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const initData = telegramInitData();
    if (!initData) throw new ApiError(401, 'Откройте Mini App из чата с ботом');

    const headers = new Headers(options.headers);
    headers.set('X-Telegram-Init-Data', initData);
    if (options.body) headers.set('Content-Type', 'application/json');

    const response = await fetch(`/api/v1${path}`, { ...options, credentials: 'omit', headers });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as ApiFailureBody;
        const message = response.status === 401 || response.status === 403
            ? 'Нет доступа'
            : body.message ?? `Ошибка запроса (${response.status})`;
        throw new ApiError(response.status, message, body.details?.fieldErrors);
    }
    return response.json() as Promise<T>;
};
