import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
}

export const route = (handler: (request: Request) => Promise<unknown>): RequestHandler => async (req, res, next) => {
    try { 
        res.json({ data: await handler(req) }); 
    } catch (error) { 
        next(error); 
    }
};

// For paginated collections: the handler's `{ data, meta }` is the response body itself.
export const listRoute = (handler: (request: Request) => Promise<{ data: unknown; meta: unknown }>): RequestHandler => async (req, res, next) => {
    try {
        res.json(await handler(req));
    } catch (error) {
        next(error);
    }
};

export const requestId: RequestHandler = (_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId);
    next();
};

export const entityId = (req: Request) => z.string().uuid().parse(req.params.id);

export const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
        res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid request', details: error.flatten(), requestId: res.locals.requestId } });
        return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2025', 'P2003', 'P2034'].includes(error.code)) {
        const status = error.code === 'P2025' ? 404 : 409;
        res.status(status).json({ error: { code: status === 404 ? 'ENTITY_NOT_FOUND' : 'DATA_CONFLICT', message: status === 404 ? 'Record not found' : 'The operation conflicts with existing data. Refresh and retry.', requestId: res.locals.requestId } });
        return;
    }
    const known = error instanceof ApiError;
    res.status(known ? error.status : 500).json({ error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Unexpected server error', requestId: res.locals.requestId } });
};

const pagination = z.object({ 
    page: z.coerce.number().int().min(1).default(1), 
    pageSize: z.coerce.number().int().min(1).max(100).default(25) 
});

export const normalizePagination = (query: unknown) => {
    const result = pagination.parse(query);
    return { ...result, skip: (result.page - 1) * result.pageSize };
};
