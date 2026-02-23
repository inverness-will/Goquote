import { Request, Response } from 'express';
import { Router } from 'express';

export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'UP' });
};

export const healthRouter = Router().get('/', healthCheck);
