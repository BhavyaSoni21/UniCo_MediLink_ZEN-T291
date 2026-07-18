'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateAllergies, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import { ALLERGY_SEVERITY_OPTIONS } from './constants';
import type { Allergy } from './types';

const initialState: ActionState = {};
const MIN_ROWS = 3;

export function AllergiesForm({ allergies }: { allergies: Allergy[] }) {
  const [state, formAction, isPending] = useActionState(updateAllergies, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const rowCount = Math.max(allergies.length + 1, MIN_ROWS);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-4">ALLERGIES</h2>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="rowCount" value={rowCount} />
        {Array.from({ length: rowCount }).map((_, i) => {
          const existing = allergies[i];
          return (
            <div
              key={i}
              className="grid sm:grid-cols-3 gap-3 border-2 border-black rounded-brutal p-3"
            >
              <input
                name={`allergy[${i}][allergyName]`}
                placeholder="Allergen"
                defaultValue={existing?.allergyName ?? ''}
                className="brutal-input"
              />
              <select
                name={`allergy[${i}][severity]`}
                defaultValue={existing?.severity ?? ''}
                className="brutal-input"
              >
                <option value="">—</option>
                {ALLERGY_SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                name={`allergy[${i}][reaction]`}
                placeholder="Reaction"
                defaultValue={existing?.reaction ?? ''}
                className="brutal-input"
              />
            </div>
          );
        })}
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        {state.success && <p className="text-sm font-bold text-brand-teal">Saved.</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save allergies'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
