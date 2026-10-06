import { Request, Response } from 'express';
import { searchAll } from './search.service';

const MIN_QUERY_LENGTH = 2;

export const searchController = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (rawQuery.length < MIN_QUERY_LENGTH) {
        return res.status(400).json({ message: `Query must be at least ${MIN_QUERY_LENGTH} characters` });
    }

    try {
        const result = await searchAll(rawQuery, { role: req.user.role });
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error performing global search:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
