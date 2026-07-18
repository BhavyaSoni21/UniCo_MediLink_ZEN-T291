import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { UploadForm } from './UploadForm';
import { ShareForm } from './ShareForm';
import { DeleteButton } from './DeleteButton';
import { ConsentsPanel } from './ConsentsPanel';
import type { Consent, MedicalRecordDetail } from './types';

export const dynamic = 'force-dynamic';

interface MinimalProfile {
  id: string;
}

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function RecordsPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const profile = await fetchJson<MinimalProfile>('/patients/me', token);
  if (!profile) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/records" />
        <div className="mx-auto max-w-3xl p-6">
          <BrutalCard>
            <p className="font-bold">
              No patient profile found. Pick the patient role on your dashboard first.
            </p>
          </BrutalCard>
        </div>
      </main>
    );
  }

  const [records, consents] = await Promise.all([
    fetchJson<MedicalRecordDetail[]>(`/records/patient/${profile.id}`, token),
    fetchJson<Consent[]>('/consents', token),
  ]);
  const recordList = records ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/records" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">MEDICAL RECORDS</h1>

        <UploadForm />

        <BrutalCard>
          <h2 className="font-display font-black text-2xl mb-4">YOUR RECORDS</h2>
          {recordList.length === 0 ? (
            <p className="text-sm">No records uploaded yet.</p>
          ) : (
            <ul className="space-y-4">
              {recordList.map((r) => (
                <li key={r.id} className="border-2 border-black rounded-brutal p-4">
                  <p className="font-display font-black text-lg">
                    {r.recordType.replace('_', ' ')}
                  </p>
                  {r.summary && <p className="text-sm">{r.summary}</p>}
                  <p className="text-xs text-zinc-600">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {r.files.map((f) => (
                      <li key={f.id} className="brutal-badge bg-white">
                        {f.downloadUrl ? (
                          <a href={f.downloadUrl} target="_blank" rel="noreferrer" className="underline">
                            {f.fileName}
                          </a>
                        ) : (
                          <span>{f.fileName}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ShareForm recordId={r.id} />
                    <DeleteButton recordId={r.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BrutalCard>

        <ConsentsPanel consents={consents ?? []} />
      </div>
    </main>
  );
}
