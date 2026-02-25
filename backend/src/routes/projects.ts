import { Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { ProjectStatus, Currency, Transport } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/httpError';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const projectsRouter = Router({ mergeParams: true });

projectsRouter.use(requireAuth);

const staffRoleSchema = z.object({
  title: z.string().min(1, 'Role title is required'),
  hourlyRateCents: z.number().int().min(0),
  perDiemCents: z.number().int().min(0),
  hotelRoomSharing: z.boolean().optional().default(false)
});

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['DRAFT', 'FINALIZED']).optional().default('DRAFT'),
  route: z.string().optional(),
  location: z.string().optional(),
  startDate: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  crew: z.number().int().min(0).optional(),
  workdays: z.number().int().min(0).optional(),
  budgetCents: z.number().int().min(0).optional(),
  currency: z.enum(['USD', 'EURO', 'GBP']).optional(),
  workSaturday: z.boolean().optional(),
  workSunday: z.boolean().optional(),
  transport: z.enum(['FLY', 'DRIVE', 'TRAIN']).optional(),
  jobSiteAddress: z.string().optional(),
  originAddress: z.string().optional(),
  originAirport: z.string().optional(),
  destinationAirport: z.string().optional(),
  hotelQuality: z.number().int().min(2).max(5).optional(),
  contingencyBudgetPct: z.number().min(0).max(100).optional(),
  staff: z.array(staffRoleSchema).optional()
});

const updateProjectSchema = createProjectSchema.partial().extend({
  staff: z.array(staffRoleSchema).optional()
});

function parseDate(value: string | Date | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

type ProjectWithStaff = Awaited<ReturnType<typeof prisma.project.findMany>>[number] & { staff?: Array<{ id: string; title: string; hourlyRateCents: number; perDiemCents: number; hotelRoomSharing: boolean }> };

function toProjectJson(p: ProjectWithStaff) {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    route: p.route,
    location: p.location,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    crew: p.crew,
    workdays: p.workdays,
    budgetCents: p.budgetCents,
    currency: p.currency,
    workSaturday: p.workSaturday,
    workSunday: p.workSunday,
    transport: p.transport,
    jobSiteAddress: p.jobSiteAddress ?? null,
    originAddress: p.originAddress ?? null,
    originAirport: p.originAirport ?? null,
    destinationAirport: p.destinationAirport ?? null,
    hotelQuality: p.hotelQuality ?? null,
    contingencyBudgetPct: p.contingencyBudgetPct ?? null,
    staff: (p.staff ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      hourlyRateCents: s.hourlyRateCents,
      perDiemCents: s.perDiemCents,
      hotelRoomSharing: s.hotelRoomSharing
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString()
  };
}

projectsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { staff: true }
    });
    res.json(projects.map(toProjectJson));
  } catch (error) {
    next(error);
  }
});

projectsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const body = createProjectSchema.parse(req.body);
    const startDate = parseDate(body.startDate as string | undefined);
    const endDate = parseDate(body.endDate as string | undefined);
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          userId,
          name: body.name,
          status: (body.status as ProjectStatus) ?? ProjectStatus.DRAFT,
          route: body.route ?? null,
          location: body.location ?? null,
          startDate,
          endDate,
          crew: body.crew ?? null,
          workdays: body.workdays ?? null,
          budgetCents: body.budgetCents ?? null,
          currency: body.currency ? (body.currency as Currency) : null,
          workSaturday: body.workSaturday ?? false,
          workSunday: body.workSunday ?? false,
          transport: body.transport ? (body.transport as Transport) : null,
          jobSiteAddress: body.jobSiteAddress ?? null,
          originAddress: body.originAddress ?? null,
          originAirport: body.originAirport ?? null,
          destinationAirport: body.destinationAirport ?? null,
          hotelQuality: body.hotelQuality ?? null,
          contingencyBudgetPct: body.contingencyBudgetPct ?? null
        }
      });
      if (body.staff?.length) {
        await tx.projectRole.createMany({
          data: body.staff.map((r) => ({
            projectId: proj.id,
            title: r.title,
            hourlyRateCents: r.hourlyRateCents,
            perDiemCents: r.perDiemCents,
            hotelRoomSharing: r.hotelRoomSharing
          }))
        });
      }
      return tx.project.findUniqueOrThrow({
        where: { id: proj.id },
        include: { staff: true }
      });
    });
    res.status(201).json(toProjectJson(project!));
  } catch (error) {
    next(error);
  }
});

projectsRouter.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const body = updateProjectSchema.parse(req.body);
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new HttpError(404, 'Project not found.');
    }
    const startDate = body.startDate !== undefined ? parseDate(body.startDate as string | undefined) : undefined;
    const endDate = body.endDate !== undefined ? parseDate(body.endDate as string | undefined) : undefined;
    const { staff: staffPayload, ...updateData } = body;
    const project = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          ...(updateData.name !== undefined && { name: updateData.name }),
          ...(updateData.status !== undefined && { status: updateData.status as ProjectStatus }),
          ...(updateData.route !== undefined && { route: updateData.route }),
          ...(updateData.location !== undefined && { location: updateData.location }),
          ...(startDate !== undefined && { startDate }),
          ...(endDate !== undefined && { endDate }),
          ...(updateData.crew !== undefined && { crew: updateData.crew }),
          ...(updateData.workdays !== undefined && { workdays: updateData.workdays }),
          ...(updateData.budgetCents !== undefined && { budgetCents: updateData.budgetCents }),
          ...(updateData.currency !== undefined && { currency: updateData.currency as Currency }),
          ...(updateData.workSaturday !== undefined && { workSaturday: updateData.workSaturday }),
          ...(updateData.workSunday !== undefined && { workSunday: updateData.workSunday }),
          ...(updateData.transport !== undefined && { transport: updateData.transport as Transport }),
          ...(updateData.jobSiteAddress !== undefined && { jobSiteAddress: updateData.jobSiteAddress }),
          ...(updateData.originAddress !== undefined && { originAddress: updateData.originAddress }),
          ...(updateData.originAirport !== undefined && { originAirport: updateData.originAirport }),
          ...(updateData.destinationAirport !== undefined && { destinationAirport: updateData.destinationAirport }),
          ...(updateData.hotelQuality !== undefined && { hotelQuality: updateData.hotelQuality }),
          ...(updateData.contingencyBudgetPct !== undefined && { contingencyBudgetPct: updateData.contingencyBudgetPct })
        }
      });
      if (staffPayload !== undefined) {
        await tx.projectRole.deleteMany({ where: { projectId: id } });
        if (staffPayload.length > 0) {
          await tx.projectRole.createMany({
            data: staffPayload.map((r) => ({
              projectId: id,
              title: r.title,
              hourlyRateCents: r.hourlyRateCents,
              perDiemCents: r.perDiemCents,
              hotelRoomSharing: r.hotelRoomSharing
            }))
          });
        }
      }
      return tx.project.findUniqueOrThrow({
        where: { id },
        include: { staff: true }
      });
    });
    res.json(toProjectJson(project!));
  } catch (error) {
    next(error);
  }
});

projectsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = req.params.id;
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new HttpError(404, 'Project not found.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.projectRole.deleteMany({ where: { projectId: id } });
      await tx.project.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
