'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointment, type ActionState } from './actions';

const initialState: ActionState = {};

export function RescheduleForm({ appointmentId }: { appointmentId: string }) {
  const [state, formAction, isPending] = useActionState(rescheduleAppointment, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="datetime-local" name="appointmentDate" className="brutal-input text-sm" />
      <button
        type="submit"
        disabled={isPending}
        className="brutal-btn brutal-btn-primary px-4 py-2 text-sm"
      >
        {isPending ? 'Saving…' : 'Reschedule'}
      </button>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
