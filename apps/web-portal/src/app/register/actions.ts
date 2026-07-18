'use server';

import { auth } from '@/lib/auth/server';

export interface RegisterState {
  error?: string;
  awaitingOtp?: boolean;
  email?: string;
}

export async function registerWithEmail(
  _prevState: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const email = formData.get('email') as string;

  const { error } = await auth.signUp.email({
    email,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  });

  if (error) {
    return { error: error.message || 'Account creation failed' };
  }

  const { error: otpError } = await auth.emailOtp.sendVerificationOtp({
    email,
    type: 'email-verification',
  });

  if (otpError) {
    return { error: otpError.message || 'Could not send a verification code' };
  }

  return { awaitingOtp: true, email };
}

export interface VerifyOtpState {
  error?: string;
  verified?: boolean;
}

export async function verifyOtp(
  _prevState: VerifyOtpState | null,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = formData.get('email') as string;
  const otp = formData.get('otp') as string;
  console.log('verifyOtp: attempting', { email, otp });

  const { error } = await auth.emailOtp.verifyEmail({ email, otp });

  if (error) {
    console.error('verifyOtp: rejected', JSON.stringify(error));
    return { error: error.message || `Invalid or expired code (${error.code})` };
  }

  return { verified: true };
}
