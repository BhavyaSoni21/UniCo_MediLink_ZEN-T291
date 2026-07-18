'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitSymptoms, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';

const initialState: ActionState = {};
const ROW_COUNT = 3;
const SEVERITY_OPTIONS = [
  { value: 1, label: '1 — Mild' },
  { value: 2, label: '2 — Mild-moderate' },
  { value: 3, label: '3 — Moderate' },
  { value: 4, label: '4 — Severe' },
  { value: 5, label: '5 — Very severe' },
];

export function SymptomsForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, isPending] = useActionState(submitSymptoms, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-1">SYMPTOMS</h2>
      <p className="text-sm text-zinc-600 mb-4">
        What are you experiencing? This is triage support, not a diagnosis.
      </p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="rowCount" value={ROW_COUNT} />
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <div
            key={i}
            className="grid sm:grid-cols-3 gap-3 border-2 border-black rounded-brutal p-3"
          >
            <input
              name={`symptom[${i}][symptomName]`}
              placeholder="Symptom (e.g. Headache)"
              className="brutal-input"
            />
            <select name={`symptom[${i}][severity]`} defaultValue="" className="brutal-input">
              <option value="" disabled>
                Severity
              </option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              name={`symptom[${i}][duration]`}
              placeholder="Duration (e.g. 2 days)"
              className="brutal-input"
            />
          </div>
        ))}
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save symptoms'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
