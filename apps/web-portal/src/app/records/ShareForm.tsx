'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { shareRecord, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';

const initialState: ActionState = {};

export function ShareForm({ recordId }: { recordId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(shareRecord, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  if (!open) {
    return (
      <BrutalButton
        type="button"
        variant="yellow"
        className="px-4 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        Share
      </BrutalButton>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 border-2 border-black rounded-brutal p-3 bg-brand-sage"
    >
      <input type="hidden" name="recordId" value={recordId} />
      <select name="grantedToType" defaultValue="DOCTOR" className="brutal-input py-1 text-sm w-auto">
        <option value="DOCTOR">Doctor</option>
        <option value="HOSPITAL">Hospital</option>
      </select>
      <input name="grantedToId" placeholder="Their account id" className="brutal-input py-1 text-sm" />
      <BrutalButton type="submit" className="px-3 py-1 text-sm" disabled={isPending}>
        {isPending ? 'Sharing…' : 'Confirm'}
      </BrutalButton>
      {state.error && <p className="text-xs font-bold text-brand-danger w-full">{state.error}</p>}
      {state.success && <p className="text-xs font-bold text-brand-teal w-full">Shared.</p>}
    </form>
  );
}
