'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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

export async function startTriageSession(
  _prevState: ActionState | null,
  _formData: FormData,
): Promise<ActionState> {
  let sessionId: string;
  try {
    const res = await apiFetch('/triage/sessions', { method: 'POST' });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not start a triage session') };
    }
    const session = (await res.json()) as { id: string };
    sessionId = session.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
  redirect(`/triage/${sessionId}`);
}

export async function submitSymptoms(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sessionId = formData.get('sessionId') as string;
    const rowCount = Number(formData.get('rowCount') ?? 3);
    const symptoms = rowsFromFormData(
      formData,
      'symptom',
      ['symptomName', 'severity', 'duration'],
      rowCount,
    )
      .filter((s) => s.symptomName && s.severity)
      .map((s) => ({
        symptomName: s.symptomName,
        severity: Number(s.severity),
        duration: s.duration || undefined,
      }));

    if (symptoms.length === 0) {
      return { error: 'Add at least one symptom with a severity' };
    }

    const res = await apiFetch(`/triage/sessions/${sessionId}/symptoms`, {
      method: 'POST',
      body: JSON.stringify({ symptoms }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save symptoms') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function submitVitals(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sessionId = formData.get('sessionId') as string;
    const toNumber = (key: string) => {
      const value = formData.get(key);
      return typeof value === 'string' && value.trim() !== '' ? Number(value) : undefined;
    };

    const body = {
      heartRate: toNumber('heartRate'),
      spo2: toNumber('spo2'),
      systolicBp: toNumber('systolicBp'),
      diastolicBp: toNumber('diastolicBp'),
      temperature: toNumber('temperature'),
      respiratoryRate: toNumber('respiratoryRate'),
    };

    if (Object.values(body).every((v) => v === undefined)) {
      return { error: 'Enter at least one vital reading' };
    }

    const res = await apiFetch(`/triage/sessions/${sessionId}/vitals`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not save vitals') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function findHospitals(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const sessionId = formData.get('sessionId') as string;
  const lat = formData.get('patientLat');
  const lng = formData.get('patientLng');
  try {
    const res = await apiFetch('/hospital-intelligence/recommend', {
      method: 'POST',
      body: JSON.stringify({
        triageSessionId: sessionId,
        ...(typeof lat === 'string' && lat && { patientLat: Number(lat) }),
        ...(typeof lng === 'string' && lng && { patientLng: Number(lng) }),
      }),
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not get hospital recommendations') };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
  redirect(`/triage/${sessionId}/hospitals`);
}

export async function evaluateTriage(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const sessionId = formData.get('sessionId') as string;
    const res = await apiFetch(`/triage/sessions/${sessionId}/evaluate`, {
      method: 'POST',
    });
    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not get a risk assessment') };
    }
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
