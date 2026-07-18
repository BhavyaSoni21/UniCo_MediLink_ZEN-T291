'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateMedications, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import type { Medication } from './types';

const initialState: ActionState = {};
const MIN_ROWS = 3;

export function MedicationsForm({ medications }: { medications: Medication[] }) {
  const [state, formAction, isPending] = useActionState(updateMedications, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const rowCount = Math.max(medications.length + 1, MIN_ROWS);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-4">MEDICATIONS</h2>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="rowCount" value={rowCount} />
        {Array.from({ length: rowCount }).map((_, i) => {
          const existing = medications[i];
          return (
            <div
              key={i}
              className="grid sm:grid-cols-5 gap-3 border-2 border-black rounded-brutal p-3"
            >
              <input
                name={`medication[${i}][medicineName]`}
                placeholder="Medicine"
                defaultValue={existing?.medicineName ?? ''}
                className="brutal-input"
              />
              <input
                name={`medication[${i}][dosage]`}
                placeholder="Dosage"
                defaultValue={existing?.dosage ?? ''}
                className="brutal-input"
              />
              <input
                name={`medication[${i}][frequency]`}
                placeholder="Frequency"
                defaultValue={existing?.frequency ?? ''}
                className="brutal-input"
              />
              <input
                type="date"
                name={`medication[${i}][startDate]`}
                defaultValue={existing?.startDate?.slice(0, 10) ?? ''}
                className="brutal-input"
              />
              <input
                type="date"
                name={`medication[${i}][endDate]`}
                defaultValue={existing?.endDate?.slice(0, 10) ?? ''}
                className="brutal-input"
              />
            </div>
          );
        })}
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        {state.success && <p className="text-sm font-bold text-brand-teal">Saved.</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save medications'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
