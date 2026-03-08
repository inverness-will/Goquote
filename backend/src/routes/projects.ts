import { Response, NextFunction } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { ProjectStatus, Currency, Transport } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../utils/httpError';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { fetchTravelPricing } from '../services/travelPricing';
import { mergeLivePricingIntoBreakdown, applySelectedTravelToBreakdown, type CostBreakdown } from '../utils/costBreakdownMerge';

export const projectsRouter = Router({ mergeParams: true });

projectsRouter.use(requireAuth);

const staffRoleSchema = z.object({
  title: z.string().min(1, 'Role title is required'),
  hourlyRateCents: z.number().int().min(0),
  perDiemCents: z.number().int().min(0),
  hotelRoomSharing: z.boolean().optional().default(false)
});

const costBreakdownLineItemSchema = z.object({
  label: z.string(),
  detail: z.string(),
  amountCents: z.number().int().min(0)
});
const costBreakdownSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  amountCents: z.number().int().min(0),
  lineItems: z.array(costBreakdownLineItemSchema).optional()
});
const costBreakdownSchema = z.object({
  sections: z.array(costBreakdownSectionSchema),
  subtotalCents: z.number().int().min(0),
  contingencyCents: z.number().int().min(0),
  totalCents: z.number().int().min(0)
});

const projectRoleRefSchema = z.object({
  roleTypeId: z.string().min(1),
  count: z.number().int().min(1)
});
const rolesSchema = z.array(projectRoleRefSchema).optional();

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
  staff: z.array(staffRoleSchema).optional(),
  costBreakdown: costBreakdownSchema.optional(),
  roles: rolesSchema.optional(),
  selectedFlightId: z.string().optional().nullable(),
  selectedHotelId: z.string().optional().nullable()
});

const updateProjectSchema = createProjectSchema.partial().extend({
  staff: z.array(staffRoleSchema).optional(),
  costBreakdown: costBreakdownSchema.optional().nullable(),
  roles: rolesSchema.optional().nullable(),
  selectedFlightId: z.string().optional().nullable(),
  selectedHotelId: z.string().optional().nullable()
});

function parseDate(value: string | Date | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

type ProjectWithRelations = Awaited<
  ReturnType<
    typeof prisma.project.findFirst<{
      include: { staff: true; flights: true; hotels: true };
    }>
  >
> & { staff?: Array<{ id: string; title: string; hourlyRateCents: number; perDiemCents: number; hotelRoomSharing: boolean }> };

function toProjectJson(p: ProjectWithRelations) {
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
    costBreakdown: (p.costBreakdown as Record<string, unknown> | null) ?? null,
    roles: (p.roles as Array<{ roleTypeId: string; count: number }>) ?? null,
    selectedFlightId: (p as { selectedFlightId?: string | null }).selectedFlightId ?? null,
    selectedHotelId: (p as { selectedHotelId?: string | null }).selectedHotelId ?? null,
    staff: (p.staff ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      hourlyRateCents: s.hourlyRateCents,
      perDiemCents: s.perDiemCents,
      hotelRoomSharing: s.hotelRoomSharing
    })),
    flights: (p as { flights?: Array<{ id: string; airline: string; flightNumber: string; departureTime: string; duration: string; numberOfChanges: number; priceCents: number; sortOrder: number; returnDepartureTime?: string | null; returnDuration?: string | null }> }).flights?.map((f) => ({
      id: f.id,
      airline: f.airline,
      flightNumber: f.flightNumber,
      departureTime: f.departureTime,
      duration: f.duration,
      numberOfChanges: f.numberOfChanges,
      priceCents: f.priceCents,
      sortOrder: f.sortOrder,
      returnDepartureTime: f.returnDepartureTime ?? null,
      returnDuration: f.returnDuration ?? null
    })) ?? [],
    hotels: (p as { hotels?: Array<{ id: string; name: string; address: string; stars: number; priceCents: number; sortOrder: number; distanceKm?: number | null }> }).hotels?.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
      stars: h.stars,
      priceCents: h.priceCents,
      sortOrder: h.sortOrder,
      distanceKm: h.distanceKm ?? null
    })) ?? [],
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
      include: { staff: true, flights: true, hotels: true }
    });
    res.json(projects.map(toProjectJson));
  } catch (error) {
    next(error);
  }
});

function toYYYYMMDD(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

projectsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const body = createProjectSchema.parse(req.body);
    const startDate = parseDate(body.startDate as string | undefined);
    const endDate = parseDate(body.endDate as string | undefined);
    const budgetFromBreakdown = body.costBreakdown?.totalCents ?? body.budgetCents ?? null;
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
          budgetCents: budgetFromBreakdown,
          currency: body.currency ? (body.currency as Currency) : null,
          workSaturday: body.workSaturday ?? false,
          workSunday: body.workSunday ?? false,
          transport: body.transport ? (body.transport as Transport) : null,
          jobSiteAddress: body.jobSiteAddress ?? null,
          originAddress: body.originAddress ?? null,
          originAirport: body.originAirport ?? null,
          destinationAirport: body.destinationAirport ?? null,
          hotelQuality: body.hotelQuality ?? null,
          contingencyBudgetPct: body.contingencyBudgetPct ?? null,
          costBreakdown: body.costBreakdown ? JSON.parse(JSON.stringify(body.costBreakdown)) : null,
          roles: body.roles ? JSON.parse(JSON.stringify(body.roles)) : null
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
        include: { staff: true, flights: true, hotels: true }
      });
    });
    const proj = project!;

    // Fetch live flight/hotel pricing when travel params present
    const depDate = toYYYYMMDD(startDate);
    const retDate = toYYYYMMDD(endDate);
    const canFetchFlights =
      body.transport === 'FLY' &&
      body.originAirport?.trim() &&
      body.destinationAirport?.trim() &&
      depDate &&
      retDate &&
      (body.crew ?? 0) > 0;
    const canFetchHotels = !!(body.jobSiteAddress?.trim() && depDate && retDate);

    console.log('[TravelPricing] POST project', {
      projectId: proj.id,
      transport: body.transport,
      originAirport: body.originAirport?.trim() || null,
      destinationAirport: body.destinationAirport?.trim() || null,
      depDate,
      retDate,
      crew: body.crew,
      jobSiteAddress: body.jobSiteAddress?.trim() || null,
      hasCostBreakdown: !!body.costBreakdown,
      costBreakdownSections: body.costBreakdown?.sections?.length ?? 0,
      canFetchFlights,
      canFetchHotels
    });

    if ((canFetchFlights || canFetchHotels) && body.costBreakdown) {
      try {
        console.log('[TravelPricing] Calling fetchTravelPricing for project', proj.id);
        const pricing = await fetchTravelPricing({
          originAirport: (body.originAirport ?? '').trim(),
          destinationAirport: (body.destinationAirport ?? '').trim(),
          departureDate: depDate!,
          returnDate: retDate!,
          adults: Math.max(1, body.crew ?? 1),
          jobSiteAddress: (body.jobSiteAddress ?? '').trim(),
          checkInDate: depDate!,
          checkOutDate: retDate!,
          hotelQuality: body.hotelQuality ?? undefined
        });

        console.log('[TravelPricing] Result for project', proj.id, {
          flightsCount: pricing.flights.length,
          hotelsCount: pricing.hotels.length,
          secondCheapestFlightCents: pricing.secondCheapestFlightCents,
          secondCheapestHotelCents: pricing.secondCheapestHotelCents
        });

        await prisma.$transaction(async (tx) => {
          await tx.projectFlight.deleteMany({ where: { projectId: proj.id } });
          await tx.projectHotel.deleteMany({ where: { projectId: proj.id } });
          if (pricing.flights.length) {
            await tx.projectFlight.createMany({
              data: pricing.flights.map((f) => ({
                projectId: proj.id,
                airline: f.airline,
                flightNumber: f.flightNumber,
                departureTime: f.departureTime,
                duration: f.duration,
                numberOfChanges: f.numberOfChanges,
                priceCents: f.priceCents,
                sortOrder: f.sortOrder,
                returnDepartureTime: f.returnDepartureTime ?? undefined,
                returnDuration: f.returnDuration ?? undefined
              }))
            });
          }
          if (pricing.hotels.length) {
            await tx.projectHotel.createMany({
              data: pricing.hotels.map((h) => ({
                projectId: proj.id,
                name: h.name,
                address: h.address,
                stars: h.stars,
                priceCents: h.priceCents,
                sortOrder: h.sortOrder,
                distanceKm: h.distanceKm ?? undefined
              }))
            });
          }
          const merged = mergeLivePricingIntoBreakdown(body.costBreakdown as CostBreakdown, {
            secondCheapestFlightCents: pricing.secondCheapestFlightCents,
            secondCheapestHotelCents: pricing.secondCheapestHotelCents,
            crew: body.crew ?? 0,
            contingencyBudgetPct: body.contingencyBudgetPct ?? 10
          });
          const createdFlights = await tx.projectFlight.findMany({
            where: { projectId: proj.id },
            orderBy: { sortOrder: 'asc' }
          });
          const createdHotels = await tx.projectHotel.findMany({
            where: { projectId: proj.id },
            orderBy: { sortOrder: 'asc' }
          });
          const selectedFlightId = createdFlights[1]?.id ?? createdFlights[0]?.id ?? null;
          const selectedHotelId = createdHotels[1]?.id ?? createdHotels[0]?.id ?? null;
          await tx.project.update({
            where: { id: proj.id },
            data: {
              costBreakdown: JSON.parse(JSON.stringify(merged)),
              budgetCents: merged.totalCents,
              selectedFlightId,
              selectedHotelId
            }
          });
        });

        const updated = await prisma.project.findUniqueOrThrow({
          where: { id: proj.id },
          include: { staff: true, flights: true, hotels: true }
        });
        console.log('[TravelPricing] Saved', pricing.flights.length, 'flights,', pricing.hotels.length, 'hotels for project', proj.id);
        return res.status(201).json(toProjectJson(updated));
      } catch (travelErr) {
        console.error('[TravelPricing] Failed for project', proj.id, travelErr);
        // Proceed with project as created (estimated breakdown only)
      }
    } else {
      console.log('[TravelPricing] Skipped (conditions not met or no costBreakdown)');
    }

    res.status(201).json(toProjectJson(proj));
  } catch (error) {
    next(error);
  }
});

const fetchTravelPricingSchema = z.object({
  originAirport: z.string().min(1).optional(),
  destinationAirport: z.string().min(1).optional(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).optional().default(1),
  jobSiteAddress: z.string().optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hotelQuality: z.number().int().min(2).max(5).optional()
});

projectsRouter.post('/fetch-travel-pricing', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = fetchTravelPricingSchema.parse(req.body);
    const canFetchFlights =
      body.originAirport?.trim() &&
      body.destinationAirport?.trim() &&
      body.departureDate &&
      body.returnDate;
    const canFetchHotels = !!(body.jobSiteAddress?.trim() && body.checkInDate && body.checkOutDate);
    if (!canFetchFlights && !canFetchHotels) {
      throw new HttpError(400, 'Provide origin/destination airports and dates for flights, or job site address and dates for hotels.');
    }
    const pricing = await fetchTravelPricing({
      originAirport: (body.originAirport ?? '').trim(),
      destinationAirport: (body.destinationAirport ?? '').trim(),
      departureDate: body.departureDate,
      returnDate: body.returnDate,
      adults: body.adults,
      jobSiteAddress: (body.jobSiteAddress ?? '').trim(),
      checkInDate: body.checkInDate ?? body.departureDate,
      checkOutDate: body.checkOutDate ?? body.returnDate,
      hotelQuality: body.hotelQuality
    });
    res.json(pricing);
  } catch (error) {
    next(error);
  }
});

function paramId(params: { id?: string | string[] }): string {
  const raw = params.id;
  const id = typeof raw === 'string' ? raw : raw?.[0];
  if (!id) throw new HttpError(400, 'Invalid project id');
  return id;
}

projectsRouter.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = paramId(req.params);
    const body = updateProjectSchema.parse(req.body);
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new HttpError(404, 'Project not found.');
    }
    const startDate = body.startDate !== undefined ? parseDate(body.startDate as string | undefined) : undefined;
    const endDate = body.endDate !== undefined ? parseDate(body.endDate as string | undefined) : undefined;
    const { staff: staffPayload, costBreakdown: costBreakdownPayload, roles: rolesPayload, ...updateData } = body;
    const budgetFromBreakdown = costBreakdownPayload != null ? (costBreakdownPayload as { totalCents?: number }).totalCents : undefined;
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
          ...(budgetFromBreakdown !== undefined && { budgetCents: budgetFromBreakdown }),
          ...(updateData.currency !== undefined && { currency: updateData.currency as Currency }),
          ...(updateData.workSaturday !== undefined && { workSaturday: updateData.workSaturday }),
          ...(updateData.workSunday !== undefined && { workSunday: updateData.workSunday }),
          ...(updateData.transport !== undefined && { transport: updateData.transport as Transport }),
          ...(updateData.jobSiteAddress !== undefined && { jobSiteAddress: updateData.jobSiteAddress }),
          ...(updateData.originAddress !== undefined && { originAddress: updateData.originAddress }),
          ...(updateData.originAirport !== undefined && { originAirport: updateData.originAirport }),
          ...(updateData.destinationAirport !== undefined && { destinationAirport: updateData.destinationAirport }),
          ...(updateData.hotelQuality !== undefined && { hotelQuality: updateData.hotelQuality }),
          ...(updateData.contingencyBudgetPct !== undefined && { contingencyBudgetPct: updateData.contingencyBudgetPct }),
          ...(costBreakdownPayload !== undefined && { costBreakdown: costBreakdownPayload === null ? null : JSON.parse(JSON.stringify(costBreakdownPayload)) }),
          ...(rolesPayload !== undefined && { roles: rolesPayload === null ? null : JSON.parse(JSON.stringify(rolesPayload)) }),
          ...(updateData.selectedFlightId !== undefined && { selectedFlightId: updateData.selectedFlightId }),
          ...(updateData.selectedHotelId !== undefined && { selectedHotelId: updateData.selectedHotelId })
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
        include: { staff: true, flights: true, hotels: true }
      });
    });
    const updatedProject = project!;
    const effectiveBreakdown = (costBreakdownPayload != null ? costBreakdownPayload : updatedProject.costBreakdown) as CostBreakdown | null;
    const depDate = toYYYYMMDD(updatedProject.startDate);
    const retDate = toYYYYMMDD(updatedProject.endDate);
    const canFetchFlights =
      updatedProject.transport === 'FLY' &&
      (updatedProject.originAirport ?? '').trim() &&
      (updatedProject.destinationAirport ?? '').trim() &&
      depDate &&
      retDate &&
      (updatedProject.crew ?? 0) > 0 &&
      effectiveBreakdown != null;
    const canFetchHotels = !!((updatedProject.jobSiteAddress ?? '').trim() && depDate && retDate && effectiveBreakdown);

    const travelParamsChanged =
      body.originAirport !== undefined ||
      body.destinationAirport !== undefined ||
      body.startDate !== undefined ||
      body.endDate !== undefined ||
      body.jobSiteAddress !== undefined ||
      body.transport !== undefined ||
      body.crew !== undefined;
    console.log('[TravelPricing] PATCH project', id, {
      transport: updatedProject.transport,
      originAirport: (updatedProject.originAirport ?? '').trim() || null,
      destinationAirport: (updatedProject.destinationAirport ?? '').trim() || null,
      depDate,
      retDate,
      crew: updatedProject.crew,
      jobSiteAddress: (updatedProject.jobSiteAddress ?? '').trim() || null,
      hasEffectiveBreakdown: !!effectiveBreakdown,
      canFetchFlights,
      canFetchHotels,
      travelParamsChanged
    });

    if ((canFetchFlights || canFetchHotels) && effectiveBreakdown && travelParamsChanged) {
      try {
        console.log('[TravelPricing] Calling fetchTravelPricing for project', id);
        const pricing = await fetchTravelPricing({
          originAirport: (updatedProject.originAirport ?? '').trim(),
          destinationAirport: (updatedProject.destinationAirport ?? '').trim(),
          departureDate: depDate!,
          returnDate: retDate!,
          adults: Math.max(1, updatedProject.crew ?? 1),
          jobSiteAddress: (updatedProject.jobSiteAddress ?? '').trim(),
          checkInDate: depDate!,
          checkOutDate: retDate!,
          hotelQuality: updatedProject.hotelQuality ?? undefined
        });
        console.log('[TravelPricing] Result for project', id, {
          flightsCount: pricing.flights.length,
          hotelsCount: pricing.hotels.length,
          secondCheapestFlightCents: pricing.secondCheapestFlightCents,
          secondCheapestHotelCents: pricing.secondCheapestHotelCents
        });
        await prisma.$transaction(async (tx) => {
          await tx.projectFlight.deleteMany({ where: { projectId: id } });
          await tx.projectHotel.deleteMany({ where: { projectId: id } });
          if (pricing.flights.length) {
            await tx.projectFlight.createMany({
              data: pricing.flights.map((f) => ({
                projectId: id,
                airline: f.airline,
                flightNumber: f.flightNumber,
                departureTime: f.departureTime,
                duration: f.duration,
                numberOfChanges: f.numberOfChanges,
                priceCents: f.priceCents,
                sortOrder: f.sortOrder,
                returnDepartureTime: f.returnDepartureTime ?? undefined,
                returnDuration: f.returnDuration ?? undefined
              }))
            });
          }
          if (pricing.hotels.length) {
            await tx.projectHotel.createMany({
              data: pricing.hotels.map((h) => ({
                projectId: id,
                name: h.name,
                address: h.address,
                stars: h.stars,
                priceCents: h.priceCents,
                sortOrder: h.sortOrder,
                distanceKm: h.distanceKm ?? undefined
              }))
            });
          }
          const merged = mergeLivePricingIntoBreakdown(effectiveBreakdown as CostBreakdown, {
            secondCheapestFlightCents: pricing.secondCheapestFlightCents,
            secondCheapestHotelCents: pricing.secondCheapestHotelCents,
            crew: updatedProject.crew ?? 0,
            contingencyBudgetPct: updatedProject.contingencyBudgetPct ?? 10
          });
          const createdFlights = await tx.projectFlight.findMany({
            where: { projectId: id },
            orderBy: { sortOrder: 'asc' }
          });
          const createdHotels = await tx.projectHotel.findMany({
            where: { projectId: id },
            orderBy: { sortOrder: 'asc' }
          });
          const selectedFlightId = createdFlights[1]?.id ?? createdFlights[0]?.id ?? null;
          const selectedHotelId = createdHotels[1]?.id ?? createdHotels[0]?.id ?? null;
          await tx.project.update({
            where: { id },
            data: {
              costBreakdown: JSON.parse(JSON.stringify(merged)),
              budgetCents: merged.totalCents,
              selectedFlightId,
              selectedHotelId
            }
          });
        });
        console.log('[TravelPricing] Saved', pricing.flights.length, 'flights,', pricing.hotels.length, 'hotels for project', id);
        const withTravel = await prisma.project.findUniqueOrThrow({
          where: { id },
          include: { staff: true, flights: true, hotels: true }
        });
        return res.json(toProjectJson(withTravel));
      } catch (travelErr) {
        console.error('[TravelPricing] Failed for project', id, travelErr);
        // Keep updated project without live travel data
      }
    } else {
      console.log('[TravelPricing] PATCH skipped (conditions not met or no breakdown)');
    }

    if (body.selectedFlightId !== undefined || body.selectedHotelId !== undefined) {
      const proj = await prisma.project.findUnique({
        where: { id },
        include: { staff: true, flights: true, hotels: true }
      });
      if (
        proj &&
        proj.costBreakdown &&
        typeof proj.costBreakdown === 'object' &&
        Array.isArray((proj.costBreakdown as CostBreakdown).sections)
      ) {
        const cb = proj.costBreakdown as CostBreakdown;
        let flightTotal: number | null = null;
        let hotelTotal: number | null = null;
        if (body.selectedFlightId != null && proj.flights?.length) {
          const f = proj.flights.find((x) => x.id === body.selectedFlightId);
          if (f) flightTotal = (proj.crew ?? 0) * f.priceCents;
        }
        if (body.selectedHotelId != null && proj.hotels?.length) {
          const h = proj.hotels.find((x) => x.id === body.selectedHotelId);
          if (h) hotelTotal = h.priceCents;
        }
        const merged = applySelectedTravelToBreakdown(cb, {
          selectedFlightTotalCents: flightTotal ?? undefined,
          selectedHotelTotalCents: hotelTotal ?? undefined,
          crew: proj.crew ?? 0,
          contingencyBudgetPct: proj.contingencyBudgetPct ?? 10
        });
        await prisma.project.update({
          where: { id },
          data: {
            costBreakdown: JSON.parse(JSON.stringify(merged)),
            budgetCents: merged.totalCents
          }
        });
        const final = await prisma.project.findUniqueOrThrow({
          where: { id },
          include: { staff: true, flights: true, hotels: true }
        });
        return res.json(toProjectJson(final));
      }
    }
    res.json(toProjectJson(updatedProject));
  } catch (error) {
    next(error);
  }
});

projectsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = paramId(req.params);
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
