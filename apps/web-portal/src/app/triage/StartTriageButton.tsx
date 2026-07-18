'use client';

import { useActionState } from 'react';
import { startTriageSession, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function StartTriageButton() {
  const [state, formAction, isPending] = useActionState(startTriageSession, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <BrutalButton type="submit" variant="yellow" disabled={isPending}>
        {isPending ? 'Starting…' : 'Start New Triage'}
      </BrutalButton>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
