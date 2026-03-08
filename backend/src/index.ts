import path from 'path';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { corsOrigins, env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';
import { roleTypesRouter } from './routes/roleTypes';
import { debugRouter } from './routes/debug';

const app = express();

app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'GoQuote Backend API',
    version: '1.0.0'
  });
});

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/role-types', roleTypesRouter);
app.use('/api/debug', debugRouter);

app.get('/api/version', (_req: Request, res: Response) => {
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    res.json({ version: pkg.version || '0.0.0' });
  } catch {
    res.json({ version: '0.0.0' });
  }
});

async function start() {
  // Import goquotes API (flights, hotels, transfers) and mount as Express routes
  const goquotesApi = await import('goquotes-server/api.js');

  app.get('/api/flights', async (req, res, next) => {
    try {
      const data = await goquotesApi.getFlights(req.query as Record<string, string | number | undefined>);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/hotels', async (req, res, next) => {
    try {
      const data = await goquotesApi.getHotels(req.query as Record<string, string | number | undefined>);
      res.json(data);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 400) {
        res.status(400).json({ error: e.message ?? 'Bad request' });
        return;
      }
      next(err);
    }
  });

  app.get('/api/transfers', async (req, res, next) => {
    try {
      const data = await goquotesApi.getTransfers(req.query as Record<string, string | number | undefined>);
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`GoQuote backend listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
