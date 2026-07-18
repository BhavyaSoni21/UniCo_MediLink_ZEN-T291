import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { BookSlotButton } from '../BookSlotButton';
import type { DoctorDetail } from '../types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DoctorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { doctorId } = await params;
  const { date } = await searchParams;
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const doctor = await fetchJson<DoctorDetail>(`/doctors/${doctorId}`, token);

  if (!doctor) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/doctors" />
        <div className="mx-auto max-w-3xl p-6">
          <BrutalCard>
            <p className="font-bold">Doctor not found.</p>
            <Link href="/doctors" className="underline text-sm">
              Back to doctors
            </Link>
          </BrutalCard>
        </div>
      </main>
    );
  }

  const selectedDate = date || todayIso();
  const slots = doctor.hospitalId
    ? await fetchJson<string[]>(
        `/appointments/availability?doctorId=${doctorId}&date=${selectedDate}`,
        token,
      )
    : null;

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/doctors" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">{doctor.name}</h1>

        <BrutalCard>
          <p className="text-sm">
            {doctor.specialization ?? 'General practice'} ·{' '}
            {doctor.hospitalName ?? 'No hospital on file'}
            {doctor.city ? `, ${doctor.city}` : ''}
          </p>
          {doctor.experienceYears !== null && (
            <p className="text-sm">{doctor.experienceYears} years of experience</p>
          )}
          {doctor.consultationFee !== null && (
            <p className="text-sm">Consultation fee: ${doctor.consultationFee}</p>
          )}
        </BrutalCard>

        <BrutalCard>
          <h2 className="font-display font-black text-2xl mb-4">BOOK AN APPOINTMENT</h2>

          {!doctor.hospitalId ? (
            <p className="text-sm">This doctor isn&apos;t accepting bookings yet.</p>
          ) : (
            <>
              <form method="GET" className="flex items-end gap-3 mb-4">
                <div>
                  <label className="text-sm font-bold uppercase">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={selectedDate}
                    min={todayIso()}
                    className="brutal-input mt-1"
                  />
                </div>
                <button type="submit" className="brutal-btn brutal-btn-primary">
                  Check availability
                </button>
              </form>

              {slots === null ? (
                <p className="text-sm">Pick a date to see open slots.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm">No open slots on this date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <BookSlotButton key={slot} doctorId={doctorId} appointmentDate={slot} />
                  ))}
                </div>
              )}
            </>
          )}
        </BrutalCard>
      </div>
    </main>
  );
}
