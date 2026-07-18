'use server';

import { cookies } from 'next/headers';
import { rowsFromFormData } from '@/lib/utils';

// These actions deliberately don't call revalidatePath('/profile'): doing so
// forces Next to inline a fresh render of /profile — an async Server
// Component with several fetch() calls — into the action's own response,
// which comes back malformed under Turbopack in Next.js 16.2.10 ("An
// unexpected response was received from the server"). /profile is already
// `dynamic = 'force-dynamic'` with no-store fetches, so there's nothing for
// revalidatePath to actually invalidate — callers refresh client-side
// instead (see each form's router.refresh() after a successful submit).
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

async function apiFetch(path: string, init: RequestInit) {
  const token = await getBearerToken();
  return fetch(`${API()}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `${fallback} (${res.status})`;
}

export async function updateProfile(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const emergencyContacts = rowsFromFormData(
      formData,
      'contact',
      ['name', 'relationship', 'phone', 'email'],
      Number(formData.get('contactRows') ?? 2),
    ).filter((c) => c.name && c.phone);

    const insurances = rowsFromFormData(
      formData,
      'insurance',
      ['providerName', 'policyNumber', 'coverageType', 'validUntil'],
      Number(formData.get('insuranceRows') ?? 2),
    ).filter((i) => i.providerName && i.policyNumber);

    const body: Record<string, unknown> = {
      firstName: (formData.get('firstName') as string) || undefined,
      lastName: (formData.get('lastName') as string) || undefined,
      dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
      gender: (formData.get('gender') as string) || undefined,
      bloodGroup: (formData.get('bloodGroup') as string) || undefined,
      heightCm: formData.get('heightCm') ? Number(formData.get('heightCm')) : undefined,
      weightKg: formData.get('weightKg') ? Number(formData.get('weightKg')) : undefined,
      emergencyContacts,
      insurances,
    };

    const addressLine1 = (formData.get('addressLine1') as string) || '';
    if (addressLine1.trim() !== '') {
      body.address = {
        addressLine1,
        addressLine2: (formData.get('addressLine2') as string) || undefined,
        city: (formData.get('city') as string) || undefined,
        state: (formData.get('state') as string) || undefined,
        country: (formData.get('country') as string) || undefined,
        pincode: (formData.get('pincode') as string) || undefined,
      };
    }

    const res = await apiFetch('/patients/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

export async function uploadPhoto(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const file = formData.get('photo');
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Choose a photo to upload' };
    }

    const token = await getBearerToken();
    const upstream = new FormData();
    upstream.set('photo', file, file.name);

    const res = await fetch(`${API()}/patients/me/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not upload photo') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function updateMedicalHistory(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const conditions = rowsFromFormData(
      formData,
      'condition',
      ['conditionName', 'status', 'diagnosisDate', 'notes'],
      Number(formData.get('rowCount') ?? 3),
    ).filter((c) => c.conditionName);

    const res = await apiFetch('/patients/medical-history', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions }),
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save medical history') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function updateAllergies(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const allergies = rowsFromFormData(
      formData,
      'allergy',
      ['allergyName', 'severity', 'reaction'],
      Number(formData.get('rowCount') ?? 3),
    ).filter((a) => a.allergyName);

    const res = await apiFetch('/patients/allergies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergies }),
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save allergies') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function updateMedications(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const medications = rowsFromFormData(
      formData,
      'medication',
      ['medicineName', 'dosage', 'frequency', 'startDate', 'endDate'],
      Number(formData.get('rowCount') ?? 3),
    ).filter((m) => m.medicineName);

    const res = await apiFetch('/patients/medications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medications }),
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save medications') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
