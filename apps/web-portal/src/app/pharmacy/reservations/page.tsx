import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { CancelReservationButton } from './CancelReservationButton';
import type { Reservation } from '../types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function ReservationsPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const reservations = (await fetchJson<Reservation[]>('/pharmacy/reservations/me', token)) ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/pharmacy" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">MY RESERVATIONS</h1>

        {reservations.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">
              No reservations yet — search the pharmacy directory to reserve a medicine.
            </p>
          </BrutalCard>
        ) : (
          <ul className="space-y-4">
            {reservations.map((r) => {
              const isActive = r.status === 'PENDING' || r.status === 'READY';
              return (
                <li key={r.id}>
                  <BrutalCard yellow={isActive}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-display font-black text-lg">{r.medicineName}</p>
                      <span className="brutal-badge bg-white">{r.status}</span>
                    </div>
                    <p className="text-sm text-zinc-700">
                      {r.quantity}x at {r.pharmacyName}
                    </p>
                    <p className="text-sm font-bold mt-1">Pickup code: {r.pickupCode}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {isActive && (
                      <div className="mt-3">
                        <CancelReservationButton reservationId={r.id} />
                      </div>
                    )}
                  </BrutalCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
