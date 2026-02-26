import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { HttpError } from '../utils/httpError';

const TABLES = ['User', 'Project', 'ProjectRole', 'OtpCode'] as const;
type TableName = (typeof TABLES)[number];

function isTableName(name: string): name is TableName {
  return TABLES.includes(name as TableName);
}

export const debugRouter = Router();

debugRouter.use(requireAuth);

debugRouter.get('/tables', (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ tables: [...TABLES] });
  } catch (error) {
    next(error);
  }
});

debugRouter.get('/tables/:name', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const name = typeof req.params.name === 'string' ? req.params.name : req.params.name?.[0] ?? '';
    if (!isTableName(name)) {
      throw new HttpError(404, `Unknown table: ${name}`);
    }
    let rows: unknown[];
    switch (name) {
      case 'User':
        rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      case 'Project':
        rows = await prisma.project.findMany({ orderBy: { updatedAt: 'desc' } });
        break;
      case 'ProjectRole':
        rows = await prisma.projectRole.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      case 'OtpCode':
        rows = await prisma.otpCode.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      default:
        rows = [];
    }
    res.json({ table: name, rows });
  } catch (error) {
    next(error);
  }
});
