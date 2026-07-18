'use server';

import { cookies } from 'next/headers';

export interface ActionState {
  error?: string;
  success?: boolean;
}

const API = () => process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function getBearerToken(): Promise<string> {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    throw new Error('Your session has expired — please log in again.');
  }
  return token;
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = await getBearerToken();
  return fetch(`${API()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  return message ?? `${fallback} (${res.status})`;
}

export async function reserveMedicine(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const pharmacyId = formData.get('pharmacyId') as string;
    const medicineId = formData.get('medicineId') as string;
    const quantity = Number(formData.get('quantity') ?? 1);

    const res = await apiFetch(`/pharmacy/pharmacies/${pharmacyId}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ medicineId, quantity }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not reserve that medicine') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function cancelReservation(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const reservationId = formData.get('reservationId') as string;
    const res = await apiFetch(`/pharmacy/reservations/${reservationId}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not cancel the reservation') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
