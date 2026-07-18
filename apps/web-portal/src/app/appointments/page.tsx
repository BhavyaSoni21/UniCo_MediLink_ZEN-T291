import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { CancelButton } from './CancelButton';
import { RescheduleForm } from './RescheduleForm';
import type { Appointment } from './types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION']);

export default async function AppointmentsPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const appointments = (await fetchJson<Appointment[]>('/appointments/me', token)) ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/appointments" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">MY APPOINTMENTS</h1>

        {appointments.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">
              No appointments yet — browse the{' '}
              <a href="/doctors" className="underline">
                doctors directory
              </a>{' '}
              to book one.
            </p>
          </BrutalCard>
        ) : (
          <ul className="space-y-4">
            {appointments.map((a) => {
              const isActive = ACTIVE_STATUSES.has(a.appointmentStatus);
              return (
                <li key={a.id}>
                  <BrutalCard yellow={isActive}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-display font-black text-lg">{a.doctorName}</p>
                      <span className="brutal-badge bg-white">{a.appointmentStatus}</span>
                    </div>
                    <p className="text-sm text-zinc-700">
                      {new Date(a.appointmentDate).toLocaleString()} · {a.hospitalName}
                      {a.city ? `, ${a.city}` : ''}
                    </p>
                    {a.queue && isActive && (
                      <p className="text-sm mt-1">
                        Queue position {a.queue.lastKnownPosition} · ~
                        {a.queue.estimatedWaitMinutes} min wait ({a.queue.status})
                      </p>
                    )}
                    {isActive && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <RescheduleForm appointmentId={a.id} />
                        <CancelButton appointmentId={a.id} />
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
