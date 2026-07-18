import Link from 'next/link';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/records', label: 'Records' },
  { href: '/triage', label: 'Triage' },
  { href: '/hospitals', label: 'Hospitals' },
  { href: '/doctors', label: 'Doctors' },
  { href: '/appointments', label: 'Appointments' },
  { href: '/pharmacy', label: 'Pharmacy' },
] as const;

// A plain `string` (not `(typeof LINKS)[number]['href']`) so role-specific
// pages that aren't in the shared nav themselves — e.g. `/doctor/profile` —
// can still pass their own path in without widening LINKS; it just won't
// highlight anything, which is correct since no such link exists here.
export function NavBar({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b-2 border-black bg-white px-6 py-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'brutal-badge',
            current === link.href ? 'bg-brand-yellow text-black' : 'bg-white',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
