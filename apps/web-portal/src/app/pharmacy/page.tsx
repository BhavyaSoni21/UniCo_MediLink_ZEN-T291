import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import type { MedicineSearchResult } from './types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const results = q
    ? (await fetchJson<MedicineSearchResult[]>(
        `/pharmacy/medicines/search?q=${encodeURIComponent(q)}`,
        token,
      )) ?? []
    : null;

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/pharmacy" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">PHARMACY</h1>

        <form method="GET" className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by medicine name (e.g. Paracetamol, Panadol)"
            className="brutal-input flex-1"
          />
          <button type="submit" className="brutal-btn brutal-btn-primary">
            Search
          </button>
        </form>

        {results === null ? (
          <BrutalCard>
            <p className="text-sm">Search for a medicine by generic or brand name.</p>
          </BrutalCard>
        ) : results.length === 0 ? (
          <BrutalCard>
            <p className="text-sm">No medicines matched &quot;{q}&quot;.</p>
          </BrutalCard>
        ) : (
          <ul className="space-y-3">
            {results.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/pharmacy/medicines/${m.id}`}
                  className="block border-2 border-black rounded-brutal p-4 hover:bg-brand-yellow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-display font-black text-lg">
                      {m.brandName ?? m.genericName}
                    </p>
                    <span className="brutal-badge bg-white">{m.strength ?? m.dosageForm}</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {m.genericName}
                    {m.manufacturer ? ` · ${m.manufacturer}` : ''}
                  </p>
                  {m.genericAlternatives.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Also available as: {m.genericAlternatives.map((a) => a.brandName).join(', ')}
                    </p>
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
