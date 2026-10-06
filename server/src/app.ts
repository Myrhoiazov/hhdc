import express from 'express';
import { createServer } from 'node:http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errors, requestId } from './common/http';

export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(requestId);
app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => console.log(JSON.stringify({ requestId: res.locals.requestId, userId: res.locals.user?.id, method: req.method, route: req.route?.path ?? req.path, status: res.statusCode, duration: Date.now() - startedAt })));
    next();
});
app.get('/api/v1/health', (_req, res) => { res.json({ data: { status: 'ok' } }); });
app.use('/api/v1', routes);
app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', requestId: res.locals.requestId } }); });
app.use(errors);
export default createServer(app);
