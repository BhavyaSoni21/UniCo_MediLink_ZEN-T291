import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import type { HospitalSummary } from './types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function HospitalsPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const hospitals = (await fetchJson<HospitalSummary[]>('/hospitals/search', token)) ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/hospitals" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">HOSPITALS</h1>

        {hospitals.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">No hospitals on file yet.</p>
          </BrutalCard>
        ) : (
          <ul className="space-y-3">
            {hospitals.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/hospitals/${h.id}`}
                  className="block border-2 border-black rounded-brutal p-4 hover:bg-brand-yellow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display font-black text-lg">{h.name}</p>
                    <span className="brutal-badge bg-white">{h.hospitalType}</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {h.city}
                    {h.state ? `, ${h.state}` : ''} ·{' '}
                    {h.availableBeds ?? '—'}/{h.totalBeds ?? '—'} beds free
                    {h.emergencySupported ? ' · Emergency care' : ''}
                  </p>
                  {h.specialties.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">{h.specialties.join(', ')}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
