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

export async function cancelAppointment(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const appointmentId = formData.get('appointmentId') as string;
    const res = await apiFetch(`/appointments/${appointmentId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not cancel the appointment') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function rescheduleAppointment(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const appointmentId = formData.get('appointmentId') as string;
    const appointmentDate = formData.get('appointmentDate') as string;
    if (!appointmentDate) {
      return { error: 'Pick a new date and time' };
    }

    const res = await apiFetch(`/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ appointmentDate: new Date(appointmentDate).toISOString() }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not reschedule the appointment') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function updateAppointmentStatus(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const appointmentId = formData.get('appointmentId') as string;
    const status = formData.get('status') as string;

    const res = await apiFetch(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not update status') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
