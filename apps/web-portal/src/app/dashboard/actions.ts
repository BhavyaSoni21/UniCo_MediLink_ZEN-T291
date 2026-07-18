'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

export interface CompleteProfileState {
  error?: string;
  success?: boolean;
}

export async function completeProfile(
  _prevState: CompleteProfileState | null,
  formData: FormData,
): Promise<CompleteProfileState> {
  try {
    const c = await cookies();
    const token = c.get('session_token')?.value;
    if (!token) {
      return { error: 'Your session has expired — please log in again.' };
    }

    const url = `${API_BASE_URL}/auth/complete-profile`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: formData.get('role') }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return { error: body?.message || `Could not save your role (${res.status})` };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error saving your role' };
  }
}
