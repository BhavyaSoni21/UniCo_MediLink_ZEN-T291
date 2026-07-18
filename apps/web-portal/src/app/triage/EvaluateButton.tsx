'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { evaluateTriage, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function EvaluateButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, isPending] = useActionState(evaluateTriage, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="sessionId" value={sessionId} />
      <BrutalButton type="submit" disabled={isPending}>
        {isPending ? 'Evaluating…' : 'Get Risk Assessment'}
      </BrutalButton>
      {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
