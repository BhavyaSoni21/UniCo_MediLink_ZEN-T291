'use server';

import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/server';

export interface LoginState {
  error?: string;
  success?: boolean;
}

export async function signInWithEmail(
  _prevState: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const { data, error } = await auth.signInEmail({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message || 'Login failed' };
  }

  if (data?.token) {
    const c = await cookies();
    c.set('session_token', data.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return { success: true };
}
