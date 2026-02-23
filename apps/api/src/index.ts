import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

// turbo changes cwd to apps/api/ when running dev scripts, so dotenv/config
// can't find the root .env. Resolve it explicitly via __dirname instead.
// __dirname = apps/api/src  →  ../../.. = monorepo root
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) loadEnv({ path: envPath });

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import booksRouter from './routes/books';
import hadithsRouter from './routes/hadiths';
import narratorsRouter from './routes/narrators';
import searchRouter from './routes/search';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.API_PORT ?? 4000;

// ── Security & utilities ───────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(compression() as express.RequestHandler);
app.use(express.json());
app.use(apiLimiter);

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/books',     booksRouter);
app.use('/api/hadiths',   hadithsRouter);
app.use('/api/narrators', narratorsRouter);
app.use('/api/search',    searchRouter);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 ────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
