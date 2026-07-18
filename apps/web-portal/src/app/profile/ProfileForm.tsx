'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, type ActionState } from './actions';
import { BrutalButton } from '@/components/brutal';
import { GENDER_OPTIONS, BLOOD_GROUP_OPTIONS } from './constants';
import type { PatientProfile } from './types';

const initialState: ActionState = {};

export function ProfileForm({ profile }: { profile: PatientProfile }) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const contactRows = Math.max(profile.emergencyContacts.length + 1, 2);
  const insuranceRows = Math.max(profile.insurances.length + 1, 2);

  return (
    <form action={formAction} className="brutal-card p-6 space-y-4">
      <input type="hidden" name="contactRows" value={contactRows} />
      <input type="hidden" name="insuranceRows" value={insuranceRows} />

      <h2 className="font-display font-black text-2xl">DEMOGRAPHICS</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold uppercase">First name</label>
          <input
            name="firstName"
            defaultValue={profile.firstName ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Last name</label>
          <input
            name="lastName"
            defaultValue={profile.lastName ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Date of birth</label>
          <input
            type="date"
            name="dateOfBirth"
            defaultValue={profile.dateOfBirth?.slice(0, 10) ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Gender</label>
          <select name="gender" defaultValue={profile.gender ?? ''} className="brutal-input mt-1">
            <option value="">—</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Blood group</label>
          <select
            name="bloodGroup"
            defaultValue={profile.bloodGroup ?? ''}
            className="brutal-input mt-1"
          >
            <option value="">—</option>
            {BLOOD_GROUP_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Height (cm)</label>
          <input
            type="number"
            step="0.1"
            name="heightCm"
            defaultValue={profile.heightCm ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            name="weightKg"
            defaultValue={profile.weightKg ?? ''}
            className="brutal-input mt-1"
          />
        </div>
      </div>

      <h2 className="font-display font-black text-2xl pt-4">ADDRESS</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="text-sm font-bold uppercase">Address line 1</label>
          <input
            name="addressLine1"
            defaultValue={profile.address?.addressLine1 ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-bold uppercase">Address line 2</label>
          <input
            name="addressLine2"
            defaultValue={profile.address?.addressLine2 ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">City</label>
          <input
            name="city"
            defaultValue={profile.address?.city ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">State</label>
          <input
            name="state"
            defaultValue={profile.address?.state ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Country</label>
          <input
            name="country"
            defaultValue={profile.address?.country ?? ''}
            className="brutal-input mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold uppercase">Pincode</label>
          <input
            name="pincode"
            defaultValue={profile.address?.pincode ?? ''}
            className="brutal-input mt-1"
          />
        </div>
      </div>

      <h2 className="font-display font-black text-2xl pt-4">EMERGENCY CONTACTS</h2>
      {Array.from({ length: contactRows }).map((_, i) => {
        const existing = profile.emergencyContacts[i];
        return (
          <div
            key={i}
            className="grid sm:grid-cols-4 gap-3 border-2 border-black rounded-brutal p-3"
          >
            <input
              name={`contact[${i}][name]`}
              placeholder="Name"
              defaultValue={existing?.name ?? ''}
              className="brutal-input"
            />
            <input
              name={`contact[${i}][relationship]`}
              placeholder="Relationship"
              defaultValue={existing?.relationship ?? ''}
              className="brutal-input"
            />
            <input
              name={`contact[${i}][phone]`}
              placeholder="Phone"
              defaultValue={existing?.phone ?? ''}
              className="brutal-input"
            />
            <input
              name={`contact[${i}][email]`}
              placeholder="Email"
              defaultValue={existing?.email ?? ''}
              className="brutal-input"
            />
          </div>
        );
      })}

      <h2 className="font-display font-black text-2xl pt-4">INSURANCE</h2>
      {Array.from({ length: insuranceRows }).map((_, i) => {
        const existing = profile.insurances[i];
        return (
          <div
            key={i}
            className="grid sm:grid-cols-4 gap-3 border-2 border-black rounded-brutal p-3"
          >
            <input
              name={`insurance[${i}][providerName]`}
              placeholder="Provider"
              defaultValue={existing?.providerName ?? ''}
              className="brutal-input"
            />
            <input
              name={`insurance[${i}][policyNumber]`}
              placeholder="Policy #"
              defaultValue={existing?.policyNumber ?? ''}
              className="brutal-input"
            />
            <input
              name={`insurance[${i}][coverageType]`}
              placeholder="Coverage"
              defaultValue={existing?.coverageType ?? ''}
              className="brutal-input"
            />
            <input
              type="date"
              name={`insurance[${i}][validUntil]`}
              defaultValue={existing?.validUntil?.slice(0, 10) ?? ''}
              className="brutal-input"
            />
          </div>
        );
      })}

      {state.error && <p className="text-sm font-bold text-brand-danger">{state.error}</p>}
      {state.success && <p className="text-sm font-bold text-brand-teal">Saved.</p>}
      <BrutalButton type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save profile'}
      </BrutalButton>
    </form>
  );
}
