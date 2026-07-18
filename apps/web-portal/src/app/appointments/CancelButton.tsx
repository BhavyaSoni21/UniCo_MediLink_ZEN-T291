'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cancelAppointment, type ActionState } from './actions';

const initialState: ActionState = {};

export function CancelButton({ appointmentId }: { appointmentId: string }) {
  const [state, formAction, isPending] = useActionState(cancelAppointment, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <button
        type="submit"
        disabled={isPending}
        className="brutal-btn bg-brand-danger text-white px-4 py-2 text-sm"
      >
        {isPending ? 'Cancelling…' : 'Cancel'}
      </button>
      {state.error && <p className="text-xs font-bold text-brand-danger mt-1">{state.error}</p>}
    </form>
  );
}
