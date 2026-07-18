import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { ReserveButton } from '../../ReserveButton';
import type { NearbyPharmacy } from '../../types';

export const dynamic = 'force-dynamic';

async function apiFetch(path: string, token: string) {
  return fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ medicineId: string }>;
}) {
  const { medicineId } = await params;
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const res = await apiFetch(`/pharmacy/pharmacies/nearby?medicineId=${medicineId}`, token);
  const noLocation = res.status === 400;
  const pharmacies: NearbyPharmacy[] = res.ok ? await res.json() : [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/pharmacy" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">NEARBY PHARMACIES</h1>

        {noLocation ? (
          <BrutalCard>
            <p className="text-sm">
              We need a location to find nearby pharmacies.{' '}
              <Link href="/profile" className="underline">
                Set your address on your profile
              </Link>{' '}
              first.
            </p>
          </BrutalCard>
        ) : pharmacies.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">No pharmacies found.</p>
          </BrutalCard>
        ) : (
          <ul className="space-y-3">
            {pharmacies.map((p) => (
              <li key={p.id}>
                <BrutalCard yellow={!!p.stock?.available}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display font-black text-lg">{p.name}</p>
                    <span className="brutal-badge bg-white">{p.distanceKm} km</span>
                  </div>
                  <p className="text-sm text-zinc-700">
                    {p.city}
                    {p.verified ? ' · Verified' : ''}
                  </p>
                  {p.stock && (
                    <p className="text-sm mt-1">
                      {p.stock.available
                        ? `${p.stock.quantity} in stock`
                        : 'Out of stock'}
                    </p>
                  )}
                  {p.stock?.available && (
                    <div className="mt-3">
                      <ReserveButton pharmacyId={p.id} medicineId={medicineId} />
                    </div>
                  )}
                </BrutalCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
