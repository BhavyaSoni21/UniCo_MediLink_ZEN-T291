'use client';

import { useActionState } from 'react';
import { completeProfile, type CompleteProfileState } from './actions';
import { UserRole } from '@medilink/shared-types';

const initialState: CompleteProfileState = {};

export function RoleForm() {
  const [state, formAction, isPending] = useActionState(completeProfile, initialState);

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
