'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerWithEmail, type RegisterState } from './actions';

const initialState: RegisterState = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerWithEmail, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard');
    }
  }, [state.success, router]);

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-8 py-24">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <form action={formAction} className="flex flex-col gap-4">
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
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={isPending} className="border p-2 font-medium">
          {isPending ? 'Creating account…' : 'Create account'}
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
