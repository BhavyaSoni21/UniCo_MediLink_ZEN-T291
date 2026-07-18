'use server';

import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/server';

export interface RegisterState {
  error?: string;
  success?: boolean;
}

export async function registerWithEmail(
  _prevState: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const { data, error } = await auth.signUpEmail({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  });

  if (error) {
    return { error: error.message || 'Account creation failed' };
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
