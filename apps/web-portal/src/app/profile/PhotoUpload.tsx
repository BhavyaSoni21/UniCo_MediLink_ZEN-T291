'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPhoto, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';

const initialState: ActionState = {};

export function PhotoUpload({ photoUrl }: { photoUrl: string | null }) {
  const [state, formAction, isPending] = useActionState(uploadPhoto, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <BrutalCard className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="h-24 w-24 shrink-0 rounded-full border-2 border-black overflow-hidden bg-brand-sage grid place-items-center">
        {photoUrl ? (
          // Presigned MinIO URLs are per-request and expire — not a fit for
          // next/image's remotePatterns allowlist, so a plain <img> is used.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display font-black text-2xl">?</span>
        )}
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="file" name="photo" accept="image/*" className="text-sm" />
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Uploading…' : 'Update photo'}
        </BrutalButton>
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        {state.success && <p className="text-sm font-bold text-brand-teal">Updated.</p>}
      </form>
    </BrutalCard>
  );
}
