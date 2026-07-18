'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reserveMedicine, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function ReserveButton({
  pharmacyId,
  medicineId,
}: {
  pharmacyId: string;
  medicineId: string;
}) {
  const [state, formAction, isPending] = useActionState(reserveMedicine, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/pharmacy/reservations');
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <input type="hidden" name="medicineId" value={medicineId} />
      <input
        type="number"
        name="quantity"
        min={1}
        defaultValue={1}
        className="brutal-input w-16 text-sm"
      />
      <BrutalButton type="submit" variant="yellow" disabled={isPending} className="text-sm px-3 py-2">
        {isPending ? 'Reserving…' : 'Reserve for Pickup'}
      </BrutalButton>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
