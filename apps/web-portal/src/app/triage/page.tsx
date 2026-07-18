import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { StartTriageButton } from './StartTriageButton';
import { UrgencyBadge } from './UrgencyBadge';
import type { TriageSession } from './types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function TriagePage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const history = (await fetchJson<TriageSession[]>('/triage/history', token)) ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/triage" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display font-black text-4xl tracking-tighter">TRIAGE</h1>
          <StartTriageButton />
        </div>

        <BrutalCard>
          <h2 className="font-display font-black text-2xl mb-4">PAST SESSIONS</h2>
          {history.length === 0 ? (
            <p className="text-sm">
              No triage sessions yet — this is symptom/vitals-based risk support, not a
              diagnosis. Start one above if you&apos;re not feeling well.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/triage/${s.id}`}
                    className="flex items-center justify-between gap-4 border-2 border-black rounded-brutal p-4 hover:bg-brand-yellow"
                  >
                    <div>
                      <p className="font-bold">{s.symptomsSummary || 'No symptoms recorded'}</p>
                      <p className="text-xs text-zinc-600">
                        {new Date(s.createdAt).toLocaleString()} · {s.status}
                      </p>
                    </div>
                    {s.urgencyLevel && <UrgencyBadge urgencyLevel={s.urgencyLevel} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BrutalCard>
      </div>
    </main>
  );
}
