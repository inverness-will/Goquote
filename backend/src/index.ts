import cors from 'cors';
import express, { Request, Response } from 'express';
import { corsOrigins, env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';

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

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`GoQuote backend listening on port ${env.PORT}`);
});
