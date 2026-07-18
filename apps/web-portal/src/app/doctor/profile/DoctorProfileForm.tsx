'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateDoctorProfile, type ActionState } from './actions';
import { BrutalButton, BrutalCard } from '@/components/brutal';
import type { DoctorDetail, Specialization } from '../../doctors/types';

interface HospitalOption {
  id: string;
  name: string;
}

const initialState: ActionState = {};

export function DoctorProfileForm({
  doctor,
  hospitals,
  specializations,
}: {
  doctor: DoctorDetail;
  hospitals: HospitalOption[];
  specializations: Specialization[];
}) {
  const [state, formAction, isPending] = useActionState(updateDoctorProfile, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <BrutalCard>
      <h2 className="font-display font-black text-2xl mb-4">MY PROFILE</h2>
      <form action={formAction} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold uppercase">Hospital</label>
            <select
              name="hospitalId"
              defaultValue={doctor.hospitalId ?? ''}
              className="brutal-input mt-1"
            >
              <option value="" disabled>
                Select a hospital
              </option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Specialization</label>
            <select
              name="specializationId"
              defaultValue={
                specializations.find((s) => s.name === doctor.specialization)?.id ?? ''
              }
              className="brutal-input mt-1"
            >
              <option value="" disabled>
                Select a specialization
              </option>
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold uppercase">License number</label>
            <input
              name="licenseNumber"
              defaultValue={doctor.licenseNumber ?? ''}
              className="brutal-input mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Years of experience</label>
            <input
              name="experienceYears"
              type="number"
              min={0}
              defaultValue={doctor.experienceYears ?? ''}
              className="brutal-input mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-bold uppercase">Consultation fee</label>
            <input
              name="consultationFee"
              type="number"
              min={0}
              step="0.01"
              defaultValue={doctor.consultationFee ?? ''}
              className="brutal-input mt-1"
            />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="availabilityStatus"
              name="availabilityStatus"
              defaultChecked={doctor.availabilityStatus}
            />
            <label htmlFor="availabilityStatus" className="text-sm font-bold uppercase">
              Accepting appointments
            </label>
          </div>
        </div>
        {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
        <BrutalButton type="submit" variant="yellow" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save profile'}
        </BrutalButton>
      </form>
    </BrutalCard>
  );
}
