'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateMedicalHistory, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import { CONDITION_STATUS_OPTIONS } from './constants';
import type { MedicalCondition } from './types';

const initialState: ActionState = {};
const MIN_ROWS = 3;

export function MedicalHistoryForm({ conditions }: { conditions: MedicalCondition[] }) {
  const [state, formAction, isPending] = useActionState(updateMedicalHistory, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const rowCount = Math.max(conditions.length + 1, MIN_ROWS);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-4">MEDICAL HISTORY</h2>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="rowCount" value={rowCount} />
        {Array.from({ length: rowCount }).map((_, i) => {
          const existing = conditions[i];
          return (
            <div
              key={i}
              className="grid sm:grid-cols-4 gap-3 border-2 border-black rounded-brutal p-3"
            >
              <input
                name={`condition[${i}][conditionName]`}
                placeholder="Condition"
                defaultValue={existing?.conditionName ?? ''}
                className="brutal-input"
              />
              <select
                name={`condition[${i}][status]`}
                defaultValue={existing?.status ?? ''}
                className="brutal-input"
              >
                <option value="">—</option>
                {CONDITION_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name={`condition[${i}][diagnosisDate]`}
                defaultValue={existing?.diagnosisDate?.slice(0, 10) ?? ''}
                className="brutal-input"
              />
              <input
                name={`condition[${i}][notes]`}
                placeholder="Notes"
                defaultValue={existing?.notes ?? ''}
                className="brutal-input"
              />
            </div>
          );
        })}
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        {state.success && <p className="text-sm font-bold text-brand-teal">Saved.</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save medical history'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
