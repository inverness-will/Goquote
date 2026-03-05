const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000';

export type RoleType = {
  id: string;
  name: string;
  hourlyRateCents: number;
  perDiemCents: number;
  hotelSoloRoom: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoleTypePayload = {
  name: string;
  hourlyRateCents: number;
  perDiemCents: number;
  hotelSoloRoom?: boolean;
};

export type UpdateRoleTypePayload = Partial<CreateRoleTypePayload>;

async function request<T>(path: string, token: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed ${res.status}`);
  return data as T;
}

export async function getRoleTypes(token: string): Promise<RoleType[]> {
  return request<RoleType[]>('/api/role-types', token, { method: 'GET' });
}

export async function createRoleType(
  token: string,
  payload: CreateRoleTypePayload
): Promise<RoleType> {
  return request<RoleType>('/api/role-types', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateRoleType(
  token: string,
  id: string,
  payload: UpdateRoleTypePayload
): Promise<RoleType> {
  return request<RoleType>(`/api/role-types/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteRoleType(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/role-types/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || `Delete failed ${res.status}`);
  }
}
