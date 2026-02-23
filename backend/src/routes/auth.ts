import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response, next: NextFunction) => {
  // TODO: implement login
  res.status(501).json({ message: 'Not implemented' });
});

authRouter.post('/register', (req: Request, res: Response, next: NextFunction) => {
  // TODO: implement register
  res.status(501).json({ message: 'Not implemented' });
});
