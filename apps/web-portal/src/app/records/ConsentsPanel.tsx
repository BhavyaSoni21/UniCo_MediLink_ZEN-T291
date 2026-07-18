'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { grantConsent, revokeConsent, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import type { Consent } from './types';

const initialState: ActionState = {};

function RevokeButton({ consentId }: { consentId: string }) {
  const [state, formAction, isPending] = useActionState(revokeConsent, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="consentId" value={consentId} />
      <button
        type="submit"
        className="brutal-btn bg-brand-danger text-white px-3 py-1 text-xs"
        disabled={isPending}
      >
        {isPending ? 'Revoking…' : 'Revoke'}
      </button>
      {state.error && <p className="text-xs font-bold text-brand-danger">{state.error}</p>}
    </form>
  );
}

export function ConsentsPanel({ consents }: { consents: Consent[] }) {
  const [grantState, grantAction, isGranting] = useActionState(grantConsent, initialState);
  const router = useRouter();

  useEffect(() => {
    if (grantState.success) {
      router.refresh();
    }
  }, [grantState.success, router]);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-4">CONSENT & SHARING</h2>

      <form action={grantAction} className="flex flex-wrap items-center gap-2 mb-2">
        <select name="grantedToType" defaultValue="DOCTOR" className="brutal-input py-2 text-sm w-auto">
          <option value="DOCTOR">Doctor</option>
          <option value="HOSPITAL">Hospital</option>
        </select>
        <input name="grantedToId" placeholder="Their account id" className="brutal-input py-2 text-sm" />
        <BrutalButton
          type="submit"
          variant="yellow"
          className="px-4 py-2 text-sm"
          disabled={isGranting}
        >
          {isGranting ? 'Granting…' : 'Grant access to all records'}
        </BrutalButton>
      </form>
      {grantState.error && (
        <p className="text-sm font-bold text-brand-danger mb-4">{grantState.error}</p>
      )}
      {grantState.success && (
        <p className="text-sm font-bold text-brand-teal mb-4">Access granted.</p>
      )}

      {consents.length === 0 ? (
        <p className="text-sm mt-4">No consents granted yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {consents.map((c) => (
            <li
              key={c.id}
              className="border-2 border-black rounded-brutal p-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-bold">
                  {c.grantedToType} · {c.grantedToId.slice(0, 8)}…
                </p>
                <p className="text-xs">
                  {c.recordId ? 'Single record' : 'All records'} · {c.status}
                </p>
              </div>
              {c.status === 'ACTIVE' && <RevokeButton consentId={c.id} />}
            </li>
          ))}
        </ul>
      )}
    </BrutalCard>
  );
}
