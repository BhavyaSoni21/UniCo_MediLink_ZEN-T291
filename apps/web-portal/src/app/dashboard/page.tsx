import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
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
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect('/login');
  }

  const { data: tokenData } = await auth.token();
  let profile: MedilinkProfile | null = null;
  if (tokenData?.token) {
    try {
      const url = `${process.env.API_BASE_URL}/auth/me`;
      console.log('DashboardPage: fetching', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenData.token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        profile = (await res.json()) as MedilinkProfile;
      } else {
        console.log('DashboardPage: /auth/me returned', res.status);
      }
    } catch (err) {
      console.error('DashboardPage: fetch to /auth/me failed', err);
    }
  } else {
    console.error('DashboardPage: no token available from auth.token()');
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-8 py-24">
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
    </main>
  );
}
