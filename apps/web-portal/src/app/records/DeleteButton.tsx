'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRecord, type ActionState } from './actions';

const initialState: ActionState = {};

export function DeleteButton({ recordId }: { recordId: string }) {
  const [state, formAction, isPending] = useActionState(deleteRecord, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="recordId" value={recordId} />
      <button
        type="submit"
        className="brutal-btn bg-brand-danger text-white px-4 py-2 text-sm"
        disabled={isPending}
      >
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}
