'use server';

import { cookies } from 'next/headers';

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function getBearerToken(): Promise<string> {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    throw new Error('Your session has expired — please log in again.');
  }
  return token;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `${fallback} (${res.status})`;
}

export async function uploadRecord(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Choose a file to upload' };
    }

    const token = await getBearerToken();
    const upstream = new FormData();
    upstream.set('file', file, file.name);

    const recordType = formData.get('recordType');
    if (typeof recordType === 'string' && recordType) {
      upstream.set('recordType', recordType);
    }
    const summary = formData.get('summary');
    if (typeof summary === 'string' && summary.trim()) {
      upstream.set('summary', summary.trim());
    }

    const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/records/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not upload the file') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function deleteRecord(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const recordId = formData.get('recordId');
    if (typeof recordId !== 'string' || !recordId) {
      return { error: 'Missing record id' };
    }

    const token = await getBearerToken();
    const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/records/${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not delete the record') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function shareRecord(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const recordId = formData.get('recordId');
    const grantedToType = formData.get('grantedToType');
    const grantedToId = formData.get('grantedToId');
    if (
      typeof recordId !== 'string' ||
      typeof grantedToType !== 'string' ||
      typeof grantedToId !== 'string' ||
      !grantedToId.trim()
    ) {
      return { error: 'Fill in who you want to share with' };
    }

    const token = await getBearerToken();
    const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/records/${recordId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grantedToType, grantedToId: grantedToId.trim() }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not share the record') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function grantConsent(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const grantedToType = formData.get('grantedToType');
    const grantedToId = formData.get('grantedToId');
    if (
      typeof grantedToType !== 'string' ||
      typeof grantedToId !== 'string' ||
      !grantedToId.trim()
    ) {
      return { error: 'Fill in who you want to grant access to' };
    }

    const token = await getBearerToken();
    const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/consents/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grantedToType, grantedToId: grantedToId.trim() }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not grant access') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function revokeConsent(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  try {
    const consentId = formData.get('consentId');
    if (typeof consentId !== 'string' || !consentId) {
      return { error: 'Missing consent id' };
    }

    const token = await getBearerToken();
    const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/consents/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ consentId }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: await errorMessage(res, 'Could not revoke access') };
    }

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
