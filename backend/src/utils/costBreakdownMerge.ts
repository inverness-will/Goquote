/**
 * Merge live flight/hotel prices into the client-provided cost breakdown.
 * Replaces sections with id 'flights' and 'hotel' when live amounts are provided,
 * then recalculates subtotal, contingency, and total.
 */

export type CostBreakdownSection = {
  id: string;
  title: string;
  amountCents: number;
  lineItems?: Array<{ label: string; detail: string; amountCents: number }>;
};

export type CostBreakdown = {
  sections: CostBreakdownSection[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
};

export function mergeLivePricingIntoBreakdown(
  breakdown: CostBreakdown,
  opts: {
    secondCheapestFlightCents: number | null;
    secondCheapestHotelCents: number | null;
    crew: number;
    contingencyBudgetPct: number;
  }
): CostBreakdown {
  const { secondCheapestFlightCents, secondCheapestHotelCents, crew, contingencyBudgetPct } = opts;
  const sections = breakdown.sections.map((sec) => {
    if (sec.id === 'flights' && secondCheapestFlightCents != null && crew > 0) {
      const totalCents = crew * secondCheapestFlightCents;
      return {
        id: sec.id,
        title: sec.title,
        amountCents: totalCents,
        lineItems: [
          {
            label: 'Round-trip (2nd of 3 live options)',
            detail: `${crew} crew × $${(secondCheapestFlightCents / 100).toFixed(0)}/person`,
            amountCents: totalCents
          }
        ]
      };
    }
    if (sec.id === 'hotel' && secondCheapestHotelCents != null) {
      return {
        id: sec.id,
        title: sec.title,
        amountCents: secondCheapestHotelCents,
        lineItems: [
          {
            label: 'Hotel stay (2nd of 3 live options)',
            detail: `Total for stay`,
            amountCents: secondCheapestHotelCents
          }
        ]
      };
    }
    return sec;
  });

  const subtotalCents = sections.reduce((sum, s) => sum + s.amountCents, 0);
  const contingencyCents = Math.round((subtotalCents * contingencyBudgetPct) / 100);
  const totalCents = subtotalCents + contingencyCents;

  return {
    sections,
    subtotalCents,
    contingencyCents,
    totalCents
  };
}

/**
 * Replace flight and/or hotel section amounts with selected option prices, then recalc totals.
 * Used when user picks a different flight/hotel in the UI.
 */
export function applySelectedTravelToBreakdown(
  breakdown: CostBreakdown,
  opts: {
    selectedFlightTotalCents?: number | null;
    selectedHotelTotalCents?: number | null;
    crew: number;
    contingencyBudgetPct: number;
  }
): CostBreakdown {
  const { selectedFlightTotalCents, selectedHotelTotalCents, crew, contingencyBudgetPct } = opts;
  const sections = breakdown.sections.map((sec) => {
    if (sec.id === 'flights' && selectedFlightTotalCents != null && crew > 0) {
      const totalCents = selectedFlightTotalCents;
      return {
        id: sec.id,
        title: sec.title,
        amountCents: totalCents,
        lineItems: [
          {
            label: 'Round-trip (selected option)',
            detail: `${crew} crew × $${(selectedFlightTotalCents / crew / 100).toFixed(0)}/person`,
            amountCents: totalCents
          }
        ]
      };
    }
    if (sec.id === 'hotel' && selectedHotelTotalCents != null) {
      return {
        id: sec.id,
        title: sec.title,
        amountCents: selectedHotelTotalCents,
        lineItems: [
          {
            label: 'Hotel stay (selected option)',
            detail: 'Total for stay',
            amountCents: selectedHotelTotalCents
          }
        ]
      };
    }
    return sec;
  });

  const subtotalCents = sections.reduce((sum, s) => sum + s.amountCents, 0);
  const contingencyCents = Math.round((subtotalCents * contingencyBudgetPct) / 100);
  const totalCents = subtotalCents + contingencyCents;

  return {
    sections,
    subtotalCents,
    contingencyCents,
    totalCents
  };
}
