'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerWithEmail, verifyOtp, type RegisterState, type VerifyOtpState } from './actions';

const initialRegisterState: RegisterState = {};
const initialOtpState: VerifyOtpState = {};

export default function RegisterPage() {
  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerWithEmail,
    initialRegisterState,
  );
  const [otpState, otpAction, isOtpPending] = useActionState(verifyOtp, initialOtpState);

  if (otpState.verified) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-8 py-24 text-center">
        <h1 className="text-2xl font-semibold">Email verified</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your MediLink account is ready.{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>{' '}
          to continue.
        </p>
      </main>
    );
  }

  if (registerState.awaitingOtp && registerState.email) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-6 px-8 py-24">
        <h1 className="text-2xl font-semibold">Enter your code</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          We sent a 6-digit verification code to {registerState.email}.
        </p>
        <form action={otpAction} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={registerState.email} />
          <input
            name="otp"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            required
            maxLength={6}
            className="border p-2"
          />
          {otpState.error && <p className="text-sm text-red-600">{otpState.error}</p>}
          <button type="submit" disabled={isOtpPending} className="border p-2 font-medium">
            {isOtpPending ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-8 py-24">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form action={registerAction} className="flex flex-col gap-4">
        <input name="name" type="text" placeholder="Full name" required className="border p-2" />
        <input name="email" type="email" placeholder="Email" required className="border p-2" />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
          className="border p-2"
        />
        {registerState.error && <p className="text-sm text-red-600">{registerState.error}</p>}
        <button type="submit" disabled={isRegisterPending} className="border p-2 font-medium">
          {isRegisterPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
