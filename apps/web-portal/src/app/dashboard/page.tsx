import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/server';
import { NavBar } from '@/components/NavBar';
import { RoleForm } from './RoleForm';

export const dynamic = 'force-dynamic';

interface MedilinkProfile {
  id: string;
  email: string | null;
  role: string;
  accountStatus: string;
  createdAt: string;
}

export default async function DashboardPage() {
  const c = await cookies();
  const token = c.get('session_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const { data: session } = await auth.getSession(token);
  if (!session?.user) {
    redirect('/login');
  }

  let profile: MedilinkProfile | null = null;
  try {
    const url = `${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/auth/me`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) {
      profile = (await res.json()) as MedilinkProfile;
    }
  } catch (err) {
    console.error('DashboardPage: fetch to /auth/me failed', err);
  }

  return (
    <main className="min-h-screen bg-white font-body">
      {profile && <NavBar current="/dashboard" />}
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-8 py-24">
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        {profile ? (
          <div className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
            <p>Email: {profile.email}</p>
            <p>Role: {profile.role}</p>
            <p>Status: {profile.accountStatus}</p>
          </div>
        ) : (
          <RoleForm />
        )}
      </div>
    </main>
  );
}
