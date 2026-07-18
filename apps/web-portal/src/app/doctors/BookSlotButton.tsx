'use client';

import { useActionState } from 'react';
import { bookAppointment, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function BookSlotButton({
  doctorId,
  appointmentDate,
}: {
  doctorId: string;
  appointmentDate: string;
}) {
  const [state, formAction, isPending] = useActionState(bookAppointment, initialState);

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="appointmentDate" value={appointmentDate} />
      <BrutalButton type="submit" variant="yellow" disabled={isPending} className="text-sm px-3 py-2">
        {isPending
          ? 'Booking…'
          : new Date(appointmentDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
      </BrutalButton>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
