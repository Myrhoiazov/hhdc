import { NextFunction, Request, Response } from 'express';
import { queryStatsContext } from '../../../prisma/prisma-client';
import { logger } from '../logger';

const QUERY_COUNT_WARNING_THRESHOLD = Number(process.env.QUERY_COUNT_WARNING_THRESHOLD ?? 10);

export const queryStats = (req: Request, res: Response, next: NextFunction) => {
    const stats = { count: 0, totalDurationMs: 0 };

    res.on('finish', () => {
        if (stats.count >= QUERY_COUNT_WARNING_THRESHOLD) {
            logger.warn(
                `[query-count] ${req.method} ${req.originalUrl} queries=${stats.count} totalDurationMs=${stats.totalDurationMs}`
            );
        }
    });

    queryStatsContext.run(stats, next);
};
