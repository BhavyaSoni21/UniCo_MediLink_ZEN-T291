'use client';

import { useActionState, useEffect } from 'react';
import { completeProfile, type CompleteProfileState } from './actions';
import { UserRole } from '@medilink/shared-types';

const initialState: CompleteProfileState = {};

export function RoleForm() {
  const [state, formAction, isPending] = useActionState(completeProfile, initialState);

  useEffect(() => {
    // A hard navigation (not router.push()) is intentional here: Next.js
    // client-side transitions re-fetch the RSC payload for the destination,
    // an async Server Component that itself calls the NestJS API — that
    // inlined re-render comes back malformed under Turbopack in Next.js
    // 16.2.10 ("An unexpected response was received from the server"). A
    // full document load re-runs the Server Component via a normal HTML
    // request instead, avoiding the broken RSC fetch path.
    if (state.success) {
      const destination =
        state.role === UserRole.Patient
          ? '/profile'
          : state.role === UserRole.Doctor
            ? '/doctor/profile'
            : '/dashboard';
      window.location.href = destination;
    }
  }, [state.success, state.role]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p>One last step — what brings you to MediLink?</p>
      <select name="role" required defaultValue="" className="border p-2">
        <option value="" disabled>
          Select a role
        </option>
        <option value={UserRole.Patient}>Patient</option>
        <option value={UserRole.Doctor}>Doctor</option>
        <option value={UserRole.Hospital}>Hospital staff</option>
        <option value={UserRole.Admin}>Admin</option>
      </select>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={isPending} className="border p-2 font-medium">
        {isPending ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}
