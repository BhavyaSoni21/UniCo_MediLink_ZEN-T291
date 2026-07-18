import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { StatusSelect } from '../StatusSelect';
import type { Appointment } from '../types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function DoctorAppointmentsPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const appointments = await fetchJson<Appointment[]>('/appointments/doctor/me', token);

  if (appointments === null) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/appointments" />
        <div className="mx-auto max-w-3xl p-6">
          <BrutalCard>
            <p className="font-bold">
              No doctor profile found. Pick the doctor role on your dashboard first.
            </p>
          </BrutalCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/appointments" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">MY SCHEDULE</h1>

        {appointments.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">No appointments booked yet.</p>
          </BrutalCard>
        ) : (
          <ul className="space-y-4">
            {appointments.map((a) => (
              <li key={a.id}>
                <BrutalCard>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display font-black text-lg">{a.patientName}</p>
                    <span className="brutal-badge bg-white">{a.priorityLevel}</span>
                  </div>
                  <p className="text-sm text-zinc-700">
                    {new Date(a.appointmentDate).toLocaleString()}
                  </p>
                  {a.queue && (
                    <p className="text-sm mt-1">
                      Queue position {a.queue.lastKnownPosition} · {a.queue.status}
                    </p>
                  )}
                  <div className="mt-3">
                    <StatusSelect appointmentId={a.id} currentStatus={a.appointmentStatus} />
                  </div>
                </BrutalCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
