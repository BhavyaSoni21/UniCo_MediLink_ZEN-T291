import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import type { HospitalDetail } from '../types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ hospitalId: string }>;
}) {
  const { hospitalId } = await params;
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const hospital = await fetchJson<HospitalDetail>(`/hospitals/${hospitalId}`, token);

  if (!hospital) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/hospitals" />
        <div className="mx-auto max-w-3xl p-6">
          <BrutalCard>
            <p className="font-bold">Hospital not found.</p>
            <Link href="/hospitals" className="underline text-sm">
              Back to hospitals
            </Link>
          </BrutalCard>
        </div>
      </main>
    );
  }

  const mapsUrl = `https://www.openstreetmap.org/?mlat=${hospital.latitude}&mlon=${hospital.longitude}#map=15/${hospital.latitude}/${hospital.longitude}`;
  const status = hospital.operationalStatus;

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/hospitals" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display font-black text-4xl tracking-tighter">{hospital.name}</h1>
          <span className="brutal-badge bg-white">{hospital.hospitalType}</span>
        </div>

        <BrutalCard>
          <p className="text-sm">
            {hospital.addressLine1 ? `${hospital.addressLine1}, ` : ''}
            {hospital.city}
            {hospital.state ? `, ${hospital.state}` : ''}
          </p>
          {hospital.contactNumber && <p className="text-sm">Contact: {hospital.contactNumber}</p>}
          <p className="text-sm">
            {hospital.emergencySupported ? 'Emergency care available' : 'No emergency care'} ·{' '}
            Reliability {(hospital.reliabilityScore * 100).toFixed(0)}%
          </p>
          {hospital.specialties.length > 0 && (
            <p className="text-sm mt-2">Specialties: {hospital.specialties.join(', ')}</p>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="brutal-btn brutal-btn-primary inline-block mt-4"
          >
            Route Here
          </a>
        </BrutalCard>

        {status && (
          <BrutalCard>
            <h2 className="font-display font-black text-2xl mb-2">LIVE STATUS</h2>
            <ul className="text-sm space-y-1">
              <li>Beds: {status.availableBeds}/{status.totalBeds} available</li>
              <li>ICU: {status.availableIcu}/{status.totalIcu} available</li>
              <li>Doctors on duty: {status.availableDoctors}/{status.totalDoctors}</li>
              <li>Current queue: {status.queueLoad}</li>
              <li>Ventilators available: {status.ventilatorsAvailable}</li>
            </ul>
            <p className="text-xs text-zinc-500 mt-2">
              Updated {new Date(status.updatedAt).toLocaleString()}
            </p>
          </BrutalCard>
        )}
      </div>
    </main>
  );
}
