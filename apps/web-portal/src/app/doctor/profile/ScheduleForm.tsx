'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateSchedule, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import type { DoctorScheduleSlot } from '../../doctors/types';

const initialState: ActionState = {};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ScheduleForm({ schedule }: { schedule: DoctorScheduleSlot[] }) {
  const [state, formAction, isPending] = useActionState(updateSchedule, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const byDay = new Map(schedule.map((s) => [s.dayOfWeek, s]));

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-1">WEEKLY SCHEDULE</h2>
      <p className="text-sm text-zinc-600 mb-4">
        Leave a day&apos;s times blank to not take appointments that day.
      </p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="rowCount" value={DAYS.length} />
        {DAYS.map((label, dayOfWeek) => {
          const existing = byDay.get(dayOfWeek);
          return (
            <div
              key={dayOfWeek}
              className="grid sm:grid-cols-4 gap-3 border-2 border-black rounded-brutal p-3 items-center"
            >
              <input type="hidden" name={`day[${dayOfWeek}][dayOfWeek]`} value={dayOfWeek} />
              <p className="font-bold text-sm">{label}</p>
              <input
                name={`day[${dayOfWeek}][startTime]`}
                type="time"
                defaultValue={existing?.startTime ?? ''}
                className="brutal-input"
              />
              <input
                name={`day[${dayOfWeek}][endTime]`}
                type="time"
                defaultValue={existing?.endTime ?? ''}
                className="brutal-input"
              />
              <select
                name={`day[${dayOfWeek}][slotDurationMinutes]`}
                defaultValue={existing?.slotDurationMinutes ?? 15}
                className="brutal-input"
              >
                <option value={15}>15 min slots</option>
                <option value={30}>30 min slots</option>
                <option value={45}>45 min slots</option>
                <option value={60}>60 min slots</option>
              </select>
            </div>
          );
        })}
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save schedule'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
