'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitVitals, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';

const initialState: ActionState = {};

const FIELDS: Array<{ name: string; label: string; step?: string }> = [
  { name: 'heartRate', label: 'Heart rate (bpm)' },
  { name: 'spo2', label: 'SpO2 (%)' },
  { name: 'systolicBp', label: 'Systolic BP' },
  { name: 'diastolicBp', label: 'Diastolic BP' },
  { name: 'temperature', label: 'Temperature (°C)', step: '0.1' },
  { name: 'respiratoryRate', label: 'Respiratory rate' },
];

export function VitalsForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, isPending] = useActionState(submitVitals, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-1">VITALS</h2>
      <p className="text-sm text-zinc-600 mb-4">
        Manual entry — leave anything you don&apos;t have blank.
      </p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="grid sm:grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="text-sm font-bold uppercase">{f.label}</label>
              <input
                name={f.name}
                type="number"
                step={f.step}
                className="brutal-input mt-1"
              />
            </div>
          ))}
        </div>
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save vitals'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
