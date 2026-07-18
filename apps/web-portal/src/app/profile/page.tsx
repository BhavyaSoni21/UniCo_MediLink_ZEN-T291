import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { BrutalCard } from '@/components/brutal';
import { NavBar } from '@/components/NavBar';
import { ProfileForm } from './ProfileForm';
import { PhotoUpload } from './PhotoUpload';
import { MedicalHistoryForm } from './MedicalHistoryForm';
import { AllergiesForm } from './AllergiesForm';
import { MedicationsForm } from './MedicationsForm';
import type { Allergy, MedicalCondition, Medication, PatientProfile, TimelineEvent } from './types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export default async function ProfilePage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;
  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  const [profile, history, allergies, medications, timeline] = await Promise.all([
    fetchJson<PatientProfile>('/patients/me', token),
    fetchJson<MedicalCondition[]>('/patients/medical-history', token),
    fetchJson<Allergy[]>('/patients/allergies', token),
    fetchJson<Medication[]>('/patients/medications', token),
    fetchJson<TimelineEvent[]>('/patients/timeline', token),
  ]);

  if (!profile) {
    return (
      <main className="min-h-screen bg-white font-body">
        <NavBar current="/profile" />
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

  const timelineEvents = timeline ?? [];

  return (
    <main className="min-h-screen bg-white font-body">
      <NavBar current="/profile" />
      <div className="mx-auto max-w-3xl space-y-8 p-6 pb-16">
        <h1 className="font-display font-black text-4xl tracking-tighter">MY PROFILE</h1>

        <PhotoUpload photoUrl={profile.profilePhotoUrl} />

        <ProfileForm profile={profile} />

        <MedicalHistoryForm conditions={history ?? []} />

        <AllergiesForm allergies={allergies ?? []} />

        <MedicationsForm medications={medications ?? []} />

        <BrutalCard>
          <h2 className="font-display font-black text-2xl mb-4">TIMELINE</h2>
          {timelineEvents.length === 0 ? (
            <p className="text-sm">No history yet.</p>
          ) : (
            <ul className="space-y-2">
              {timelineEvents.map((event, i) => (
                <li
                  key={i}
                  className="border-2 border-black rounded-brutal p-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-bold">{event.title}</p>
                    {event.detail && <p className="text-sm">{event.detail}</p>}
                  </div>
                  <span className="brutal-badge bg-brand-sage text-black whitespace-nowrap">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BrutalCard>
      </div>
    </main>
  );
}
