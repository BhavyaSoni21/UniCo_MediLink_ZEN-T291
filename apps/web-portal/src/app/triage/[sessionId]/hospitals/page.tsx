import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import type { HospitalRecommendation } from '../../../hospitals/types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function TriageHospitalsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const recommendations = await fetchJson<HospitalRecommendation[]>(
    `/hospital-intelligence/sessions/${sessionId}/recommendations`,
    token,
  );

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/triage" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display font-black text-4xl tracking-tighter">RECOMMENDED HOSPITALS</h1>
          <Link href={`/triage/${sessionId}`} className="text-sm underline">
            Back to session
          </Link>
        </div>

        {!recommendations || recommendations.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">
              No recommendations yet.{' '}
              <Link href={`/triage/${sessionId}`} className="underline">
                Go back and click &quot;Find a Hospital&quot;
              </Link>
              .
            </p>
          </BrutalCard>
        ) : (
          <ul className="space-y-4">
            {recommendations.map((r, i) => (
              <li key={r.recommendationId}>
                <Link href={`/hospitals/${r.hospitalId}`} className="block">
                  <BrutalCard yellow={i === 0} className="hover:opacity-90">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-display font-black text-xl">{r.name}</p>
                      <span className="brutal-badge bg-white">{Math.round(r.score)}/100</span>
                    </div>
                    <p className="text-sm text-zinc-700">
                      {r.city} · {r.hospitalType} · ~{r.etaMinutes} min away · ~
                      {r.waitTimeMinutes} min wait
                      {r.emergencySupported ? ' · Emergency care' : ''}
                    </p>
                    <p className="text-sm mt-2">{r.explanation}</p>
                  </BrutalCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
