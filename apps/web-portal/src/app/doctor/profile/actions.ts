'use server';

import { cookies } from 'next/headers';
import { rowsFromFormData } from '@/lib/utils';

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

export async function updateDoctorProfile(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const body: Record<string, unknown> = {
      hospitalId: (formData.get('hospitalId') as string) || undefined,
      specializationId: formData.get('specializationId')
        ? Number(formData.get('specializationId'))
        : undefined,
      licenseNumber: (formData.get('licenseNumber') as string) || undefined,
      experienceYears: formData.get('experienceYears')
        ? Number(formData.get('experienceYears'))
        : undefined,
      consultationFee: formData.get('consultationFee')
        ? Number(formData.get('consultationFee'))
        : undefined,
      availabilityStatus: formData.get('availabilityStatus') === 'on',
    };

    const res = await apiFetch('/doctors/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save your profile') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

const DAY_FIELDS = ['dayOfWeek', 'startTime', 'endTime', 'slotDurationMinutes'];

export async function updateSchedule(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const rowCount = Number(formData.get('rowCount') ?? 7);
    const rows = rowsFromFormData(formData, 'day', DAY_FIELDS, rowCount).filter(
      (r) => r.startTime && r.endTime,
    );

    const schedule = rows.map((r) => ({
      dayOfWeek: Number(r.dayOfWeek),
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMinutes: r.slotDurationMinutes ? Number(r.slotDurationMinutes) : undefined,
    }));

    const res = await apiFetch('/doctors/me/schedule', {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save your schedule') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
