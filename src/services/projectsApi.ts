const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000';

export type ProjectStatus = 'DRAFT' | 'FINALIZED';
export type Currency = 'USD' | 'EURO' | 'GBP';
export type Transport = 'FLY' | 'DRIVE' | 'TRAIN';

export type ProjectRole = {
  id: string;
  title: string;
  hourlyRateCents: number;
  perDiemCents: number;
  hotelRoomSharing: boolean;
};

export type CostBreakdownLineItem = {
  label: string;
  detail: string;
  amountCents: number;
};

export type CostBreakdownSection = {
  id: string;
  title: string;
  amountCents: number;
  lineItems?: CostBreakdownLineItem[];
};

export type CostBreakdown = {
  sections: CostBreakdownSection[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
};

export type ProjectRoleRef = {
  roleTypeId: string;
  count: number;
};

export type ProjectFlight = {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  duration: string;
  numberOfChanges: number;
  priceCents: number;
  sortOrder: number;
  returnDepartureTime?: string | null;
  returnDuration?: string | null;
};

export type ProjectHotel = {
  id: string;
  name: string;
  address: string;
  stars: number;
  priceCents: number;
  sortOrder: number;
  distanceKm?: number | null;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  route: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  crew: number | null;
  workdays: number | null;
  budgetCents: number | null;
  currency: Currency | null;
  workSaturday: boolean;
  workSunday: boolean;
  transport: Transport | null;
  jobSiteAddress: string | null;
  originAddress: string | null;
  originAirport: string | null;
  destinationAirport: string | null;
  hotelQuality: number | null; // 2..5
  contingencyBudgetPct: number | null;
  costBreakdown: CostBreakdown | null;
  roles: ProjectRoleRef[] | null;
  selectedFlightId: string | null;
  selectedHotelId: string | null;
  staff: ProjectRole[];
  flights?: ProjectFlight[];
  hotels?: ProjectHotel[];
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectRolePayload = {
  title: string;
  hourlyRateCents: number;
  perDiemCents: number;
  hotelRoomSharing?: boolean;
};

export type CreateProjectPayload = {
  name: string;
  status?: ProjectStatus;
  route?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  crew?: number;
  workdays?: number;
  budgetCents?: number;
  currency?: Currency;
  workSaturday?: boolean;
  workSunday?: boolean;
  transport?: Transport;
  jobSiteAddress?: string;
  originAddress?: string;
  originAirport?: string;
  destinationAirport?: string;
  hotelQuality?: number;
  contingencyBudgetPct?: number;
  staff?: CreateProjectRolePayload[];
  costBreakdown?: CostBreakdown;
  roles?: ProjectRoleRef[];
  selectedFlightId?: string | null;
  selectedHotelId?: string | null;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

async function request<T>(
  path: string,
  token: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export type TravelPricingFlight = {
  airline: string;
  flightNumber: string;
  departureTime: string;
  duration: string;
  numberOfChanges: number;
  priceCents: number;
  sortOrder: number;
};

export type TravelPricingHotel = {
  name: string;
  address: string;
  stars: number;
  priceCents: number;
  sortOrder: number;
};

export type TravelPricingResult = {
  flights: TravelPricingFlight[];
  hotels: TravelPricingHotel[];
  secondCheapestFlightCents: number | null;
  secondCheapestHotelCents: number | null;
};

export async function fetchTravelPricing(
  token: string,
  params: {
    originAirport?: string;
    destinationAirport?: string;
    departureDate: string;
    returnDate: string;
    adults?: number;
    jobSiteAddress?: string;
    checkInDate?: string;
    checkOutDate?: string;
    hotelQuality?: number;
  }
): Promise<TravelPricingResult> {
  return request<TravelPricingResult>('/api/projects/fetch-travel-pricing', token, {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getProjects(token: string): Promise<Project[]> {
  return request<Project[]>('/api/projects', token, { method: 'GET' });
}

export async function createProject(
  token: string,
  payload: CreateProjectPayload
): Promise<Project> {
  return request<Project>('/api/projects', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateProject(
  token: string,
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  return request<Project>(`/api/projects/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteProject(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (response.ok) {
    return; // 204 No Content has no body
  }
  const payload = await response.json().catch(() => null);
  const message = payload?.message || `Request failed with status ${response.status}`;
  throw new Error(message);
}
