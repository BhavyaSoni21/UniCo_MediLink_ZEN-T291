'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
  return message ?? `${fallback} (${res.status})`;
}

export async function bookAppointment(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const token = await getBearerToken();
    const doctorId = formData.get('doctorId') as string;
    const appointmentDate = formData.get('appointmentDate') as string;

    const res = await fetch(`${API()}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ doctorId, appointmentDate }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not book that slot') };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
  redirect('/appointments');
}
