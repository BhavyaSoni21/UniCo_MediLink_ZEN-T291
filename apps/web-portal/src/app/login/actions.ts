'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';

export interface LoginState {
  error?: string;
}

export async function signInWithEmail(
  _prevState: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const { error } = await auth.signIn.email({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      return { error: 'Please verify your email before logging in — check your inbox.' };
    }
    return { error: error.message || 'Login failed' };
  }

  redirect('/dashboard');
}
