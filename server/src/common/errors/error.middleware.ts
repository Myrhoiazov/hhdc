import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import ApiError from './api-error';
import { logger } from '../logger';

const errorMiddleware: ErrorRequestHandler = function errorMiddleware(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (err instanceof ApiError) {
        logger.error(`Error: ${err.message} | Path: ${req.path} | Stack: ${err.stack}`);
        res.status(err.status).json({ message: err.message, errors: err.errors });
        return;
    }

    console.error('Unexpected error:', err);
    res.status(500).json({ message: 'Непредвиденная ошибка!' });
};

export default errorMiddleware;
