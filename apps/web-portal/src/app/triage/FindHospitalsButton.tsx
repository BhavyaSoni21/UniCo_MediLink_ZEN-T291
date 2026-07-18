'use client';

import { useActionState, useRef } from 'react';
import { findHospitals, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function FindHospitalsButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, isPending] = useActionState(findHospitals, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!navigator.geolocation) {
      formRef.current?.requestSubmit();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = String(pos.coords.latitude);
        if (lngRef.current) lngRef.current.value = String(pos.coords.longitude);
        formRef.current?.requestSubmit();
      },
      () => {
        // Denied or unavailable — submit anyway; the backend falls back to
        // the patient's saved address coordinates, or returns a clear error
        // if neither is available.
        formRef.current?.requestSubmit();
      },
      { timeout: 5000 },
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input ref={latRef} type="hidden" name="patientLat" />
      <input ref={lngRef} type="hidden" name="patientLng" />
      <BrutalButton type="submit" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Finding hospitals…' : 'Find a Hospital'}
      </BrutalButton>
      {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
