import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { DoctorProfileForm } from './DoctorProfileForm';
import { ScheduleForm } from './ScheduleForm';
import type { DoctorDetail, Specialization } from '../../doctors/types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function DoctorProfilePage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const [doctor, hospitals, specializations] = await Promise.all([
    fetchJson<DoctorDetail>('/doctors/me', token),
    fetchJson<Array<{ id: string; name: string }>>('/hospitals/search', token),
    fetchJson<Specialization[]>('/doctors/specializations', token),
  ]);

  if (!doctor) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/doctor/profile" />
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
      <NavBar current="/doctor/profile" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">DOCTOR PROFILE</h1>

        <DoctorProfileForm
          doctor={doctor}
          hospitals={hospitals ?? []}
          specializations={specializations ?? []}
        />

        <ScheduleForm schedule={doctor.schedule} />
      </div>
    </main>
  );
}
