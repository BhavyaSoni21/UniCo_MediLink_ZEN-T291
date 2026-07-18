import Link from 'next/link';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/records', label: 'Records' },
  { href: '/triage', label: 'Triage' },
  { href: '/hospitals', label: 'Hospitals' },
] as const;

export function NavBar({ current }: { current: (typeof LINKS)[number]['href'] }) {
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
