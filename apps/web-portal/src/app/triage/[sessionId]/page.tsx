import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { SymptomsForm } from '../SymptomsForm';
import { VitalsForm } from '../VitalsForm';
import { EvaluateButton } from '../EvaluateButton';
import { UrgencyBadge } from '../UrgencyBadge';
import { FindHospitalsButton } from '../FindHospitalsButton';
import type { TriageSession } from '../types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function TriageSessionPage({
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

  const triageSession = await fetchJson<TriageSession>(`/triage/sessions/${sessionId}`, token);

  if (!triageSession) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/triage" />
        <div className="mx-auto max-w-3xl p-6">
          <BrutalCard>
            <p className="font-bold">Triage session not found.</p>
            <Link href="/triage" className="underline text-sm">
              Back to triage
            </Link>
          </BrutalCard>
        </div>
      </main>
    );
  }

  const isCompleted = triageSession.status === 'COMPLETED';
  const canEvaluate = triageSession.symptoms.length > 0 && triageSession.vitalsReadings.length > 0;

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/triage" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display font-black text-4xl tracking-tighter">TRIAGE SESSION</h1>
          {triageSession.urgencyLevel && <UrgencyBadge urgencyLevel={triageSession.urgencyLevel} />}
        </div>

        {isCompleted ? (
          <BrutalCard yellow>
            <h2 className="font-display font-black text-2xl mb-2">RISK ASSESSMENT</h2>
            <p className="font-bold text-lg mb-1">
              Risk score: {triageSession.riskScore}/100 — {triageSession.careLevel}
            </p>
            <p className="text-sm mb-4">{triageSession.aiExplanation}</p>
            {triageSession.redFlags && triageSession.redFlags.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-bold uppercase">Red flags</p>
                <ul className="list-disc list-inside text-sm">
                  {triageSession.redFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            <FindHospitalsButton sessionId={triageSession.id} />
          </BrutalCard>
        ) : (
          <>
            {triageSession.symptoms.length > 0 && (
              <BrutalCard>
                <h2 className="font-display font-black text-2xl mb-2">SAVED SYMPTOMS</h2>
                <ul className="text-sm space-y-1">
                  {triageSession.symptoms.map((s) => (
                    <li key={s.id}>
                      {s.symptomName} — severity {s.severity}
                      {s.duration ? ` · ${s.duration}` : ''}
                    </li>
                  ))}
                </ul>
              </BrutalCard>
            )}
            <SymptomsForm sessionId={triageSession.id} />

            {triageSession.vitalsReadings.length > 0 && (
              <BrutalCard>
                <h2 className="font-display font-black text-2xl mb-2">SAVED VITALS</h2>
                {triageSession.vitalsReadings.map((v) => (
                  <p key={v.id} className="text-sm">
                    HR {v.heartRate ?? '—'} · SpO2 {v.spo2 ?? '—'}% · BP{' '}
                    {v.systolicBp ?? '—'}/{v.diastolicBp ?? '—'} · Temp {v.temperature ?? '—'}°C ·
                    RR {v.respiratoryRate ?? '—'}
                  </p>
                ))}
              </BrutalCard>
            )}
            <VitalsForm sessionId={triageSession.id} />

            {canEvaluate && <EvaluateButton sessionId={triageSession.id} />}
          </>
        )}
      </div>
    </main>
  );
}
