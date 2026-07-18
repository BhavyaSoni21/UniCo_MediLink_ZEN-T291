'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/server';

export interface CompleteProfileState {
  error?: string;
}

export async function completeProfile(
  _prevState: CompleteProfileState | null,
  formData: FormData,
): Promise<CompleteProfileState> {
  try {
    const { data, error: tokenError } = await auth.token();
    if (tokenError || !data?.token) {
      console.error('completeProfile: auth.token() failed', tokenError);
      return { error: 'Your session has expired — please log in again.' };
    }

    const url = `${process.env.API_BASE_URL}/auth/complete-profile`;
    console.log('completeProfile: POSTing to', url);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.token}`,
      },
      body: JSON.stringify({ role: formData.get('role') }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      console.error('completeProfile: backend rejected', res.status, body);
      return { error: body?.message || `Could not save your role (${res.status})` };
    }

    revalidatePath('/dashboard');
    return {};
  } catch (err) {
    console.error('completeProfile: unexpected error', err);
    return { error: err instanceof Error ? err.message : 'Unexpected error saving your role' };
  }
}
