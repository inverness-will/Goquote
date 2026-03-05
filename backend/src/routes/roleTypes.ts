import { Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/httpError';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const roleTypesRouter = Router();

roleTypesRouter.use(requireAuth);

const createRoleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hourlyRateCents: z.number().int().min(0),
  perDiemCents: z.number().int().min(0),
  hotelSoloRoom: z.boolean().optional().default(false)
});

const updateRoleTypeSchema = createRoleTypeSchema.partial();

function toJson(r: { id: string; name: string; hourlyRateCents: number; perDiemCents: number; hotelSoloRoom: boolean; createdAt: Date; updatedAt: Date }) {
  return {
    id: r.id,
    name: r.name,
    hourlyRateCents: r.hourlyRateCents,
    perDiemCents: r.perDiemCents,
    hotelSoloRoom: r.hotelSoloRoom,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  };
}

roleTypesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const list = await prisma.roleType.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    });
    res.json(list.map(toJson));
  } catch (error) {
    next(error);
  }
});

roleTypesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const body = createRoleTypeSchema.parse(req.body);
    const role = await prisma.roleType.create({
      data: {
        userId,
        name: body.name,
        hourlyRateCents: body.hourlyRateCents,
        perDiemCents: body.perDiemCents,
        hotelSoloRoom: body.hotelSoloRoom
      }
    });
    res.status(201).json(toJson(role));
  } catch (error) {
    next(error);
  }
});

roleTypesRouter.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
    if (!id) throw new HttpError(400, 'Invalid id');
    const body = updateRoleTypeSchema.parse(req.body);
    const existing = await prisma.roleType.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, 'Role type not found');
    const role = await prisma.roleType.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.hourlyRateCents !== undefined && { hourlyRateCents: body.hourlyRateCents }),
        ...(body.perDiemCents !== undefined && { perDiemCents: body.perDiemCents }),
        ...(body.hotelSoloRoom !== undefined && { hotelSoloRoom: body.hotelSoloRoom })
      }
    });
    res.json(toJson(role));
  } catch (error) {
    next(error);
  }
});

roleTypesRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
    if (!id) throw new HttpError(400, 'Invalid id');
    const existing = await prisma.roleType.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, 'Role type not found');
    await prisma.roleType.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
