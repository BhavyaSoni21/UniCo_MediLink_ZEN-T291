import Link from 'next/link';
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-4 px-8 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          MediLink
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          AI-powered healthcare coordination and emergency management platform.
          Web portal scaffold — patient, doctor, hospital, and admin experiences
          land in upcoming phases.
        </p>
        {session?.user ? (
          <Link href="/dashboard" className="border p-2 font-medium">
            Go to dashboard
          </Link>
        ) : (
          <div className="flex gap-4">
            <Link href="/login" className="border p-2 font-medium">
              Log in
            </Link>
            <Link href="/register" className="border p-2 font-medium">
              Register
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
