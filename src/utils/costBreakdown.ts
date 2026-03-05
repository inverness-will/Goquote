import type { CostBreakdown, CostBreakdownSection, CreateProjectRolePayload } from '../services/projectsApi';

/** Placeholder rate per night in cents by hotel quality (2–5). Will be replaced by travel site APIs. */
const HOTEL_RATE_CENTS_BY_QUALITY: Record<number, number> = {
  2: 8000,   // $80/night
  3: 13400,  // $134/night
  4: 14900,  // $149/night
  5: 20000   // $200/night
};
const HOTEL_RATE_SINGLE_CENTS = 14900; // single room premium
/** Placeholder flight cost per leg in cents. Will be replaced by travel site APIs. */
const FLIGHT_COST_PER_LEG_CENTS = 42000; // $420/leg
const HOURS_PER_WORKDAY = 8;

export type CostBreakdownInput = {
  staff: CreateProjectRolePayload[];
  workdays: number;
  hotelQuality?: number; // 2..5
  contingencyBudgetPct?: number;
  transport?: 'FLY' | 'DRIVE' | 'TRAIN' | null;
};

/**
 * Build cost breakdown from project inputs. Hotel and flight amounts use placeholder rates;
 * these will be filled automatically later via travel site APIs.
 */
export function buildCostBreakdown(input: CostBreakdownInput): CostBreakdown {
  const { staff, workdays, hotelQuality = 3, contingencyBudgetPct = 10, transport } = input;
  const crew = staff.length;
  const nights = Math.max(1, workdays);
  const rateSharedCents = HOTEL_RATE_CENTS_BY_QUALITY[hotelQuality] ?? 13400;
  const singleCount = staff.filter((s) => !s.hotelRoomSharing).length;
  const sharedCount = staff.filter((s) => s.hotelRoomSharing).length;
  const sharedRooms = Math.ceil(sharedCount / 2);
  const totalRooms = singleCount + sharedRooms;

  const hotelNightsCents = sharedRooms * nights * rateSharedCents;
  const singleRoomsCents = singleCount * nights * HOTEL_RATE_SINGLE_CENTS;
  const hotelTotalCents = hotelNightsCents + singleRoomsCents;

  const hotelLineItems: CostBreakdownSection['lineItems'] = [];
  if (sharedRooms > 0) {
    hotelLineItems.push({
      label: 'Hotel Nights (shared)',
      detail: `${sharedRooms} rooms × ${nights} nights × $${(rateSharedCents / 100).toFixed(0)}/night`,
      amountCents: hotelNightsCents
    });
  }
  if (singleCount > 0) {
    hotelLineItems.push({
      label: 'Single Rooms',
      detail: `${singleCount} room(s) × ${nights} nights × $${(HOTEL_RATE_SINGLE_CENTS / 100).toFixed(0)}/night`,
      amountCents: singleRoomsCents
    });
  }
  if (hotelLineItems.length === 0) {
    hotelLineItems.push({
      label: 'Hotel Nights',
      detail: `${totalRooms} rooms × ${nights} nights`,
      amountCents: hotelTotalCents
    });
  }

  const sections: CostBreakdownSection[] = [
    {
      id: 'hotel',
      title: 'Hotel Total',
      amountCents: hotelTotalCents,
      lineItems: hotelLineItems
    }
  ];

  let flightsTotalCents = 0;
  if (transport === 'FLY' && crew > 0) {
    flightsTotalCents = crew * 2 * FLIGHT_COST_PER_LEG_CENTS;
    sections.push({
      id: 'flights',
      title: 'Flights Total',
      amountCents: flightsTotalCents,
      lineItems: [
        {
          label: 'Round-trip',
          detail: `${crew} crew × 2 legs × $${(FLIGHT_COST_PER_LEG_CENTS / 100).toFixed(0)}`,
          amountCents: flightsTotalCents
        }
      ]
    });
  }

  // Group staff by role title for per-role line items
  const byTitle = new Map<string, CreateProjectRolePayload[]>();
  for (const s of staff) {
    const key = s.title?.trim() || 'Unknown';
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push(s);
  }

  const perDiemTotalCents = staff.reduce((sum, s) => sum + s.perDiemCents * nights, 0);
  const perDiemLineItems: CostBreakdownSection['lineItems'] = [];
  for (const [title, group] of byTitle.entries()) {
    const count = group.length;
    const rateCents = group[0].perDiemCents; // same for all in group
    const amountCents = rateCents * nights * count;
    perDiemLineItems.push({
      label: title,
      detail: `${count} × ${nights} days × $${(rateCents / 100).toFixed(0)}/day per diem`,
      amountCents
    });
  }
  if (perDiemLineItems.length === 0) {
    perDiemLineItems.push({
      label: 'Daily allowance',
      detail: `${crew} crew × ${nights} days`,
      amountCents: perDiemTotalCents
    });
  }
  sections.push({
    id: 'perdiem',
    title: 'Per Diem Total',
    amountCents: perDiemTotalCents,
    lineItems: perDiemLineItems
  });

  const laborTotalCents = staff.reduce(
    (sum, s) => sum + s.hourlyRateCents * workdays * HOURS_PER_WORKDAY,
    0
  );
  const laborLineItems: CostBreakdownSection['lineItems'] = [];
  for (const [title, group] of byTitle.entries()) {
    const count = group.length;
    const rateCents = group[0].hourlyRateCents;
    const amountCents = rateCents * workdays * HOURS_PER_WORKDAY * count;
    laborLineItems.push({
      label: title,
      detail: `${count} × ${workdays} days × ${HOURS_PER_WORKDAY} hrs × $${(rateCents / 100).toFixed(0)}/hr`,
      amountCents
    });
  }
  if (laborLineItems.length === 0) {
    laborLineItems.push({
      label: 'Hourly',
      detail: `${crew} crew × ${workdays} days × ${HOURS_PER_WORKDAY} hrs`,
      amountCents: laborTotalCents
    });
  }
  sections.push({
    id: 'labor',
    title: 'Labor Total',
    amountCents: laborTotalCents,
    lineItems: laborLineItems
  });

  const subtotalCents = sections.reduce((sum, s) => sum + s.amountCents, 0);
  const contingencyCents = Math.round((subtotalCents * (contingencyBudgetPct ?? 0)) / 100);
  const totalCents = subtotalCents + contingencyCents;

  return {
    sections,
    subtotalCents,
    contingencyCents,
    totalCents
  };
}
