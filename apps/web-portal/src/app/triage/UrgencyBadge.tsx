import { AlertTriangle, Activity, CheckCircle2, type LucideIcon } from 'lucide-react';
import { StatBadge } from '@/components/brutal';

const CONFIG: Record<string, { icon: LucideIcon; tone: 'positive' | 'emergency' }> = {
  LOW: { icon: CheckCircle2, tone: 'positive' },
  MEDIUM: { icon: Activity, tone: 'positive' },
  HIGH: { icon: AlertTriangle, tone: 'emergency' },
  EMERGENCY: { icon: AlertTriangle, tone: 'emergency' },
};

export function UrgencyBadge({ urgencyLevel }: { urgencyLevel: string }) {
  const config = CONFIG[urgencyLevel] ?? CONFIG.LOW;
  return <StatBadge icon={config.icon} label={urgencyLevel} tone={config.tone} />;
}
