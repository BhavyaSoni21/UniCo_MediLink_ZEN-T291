'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateAppointmentStatus, type ActionState } from './actions';

const initialState: ActionState = {};
const STATUSES = ['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export function StatusSelect({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const [state, formAction, isPending] = useActionState(updateAppointmentStatus, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <select
        name="status"
        defaultValue={currentStatus}
        disabled={isPending}
        className="brutal-input text-sm"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
