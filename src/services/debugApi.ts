const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:4000';

export async function getDebugTables(token: string): Promise<{ tables: string[] }> {
  const res = await fetch(`${API_BASE_URL}/api/debug/tables`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Failed ${res.status}`);
  return data;
}

export async function getDebugTableRows(
  token: string,
  tableName: string
): Promise<{ table: string; rows: Record<string, unknown>[] }> {
  const res = await fetch(`${API_BASE_URL}/api/debug/tables/${encodeURIComponent(tableName)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Failed ${res.status}`);
  return data;
}

export async function deleteDebugRow(
  token: string,
  tableName: string,
  id: string
): Promise<void> {
  const safeId = String(id).trim();
  const res = await fetch(
    `${API_BASE_URL}/api/debug/tables/${encodeURIComponent(tableName)}/${encodeURIComponent(safeId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || `Delete failed ${res.status}`);
  }
}
