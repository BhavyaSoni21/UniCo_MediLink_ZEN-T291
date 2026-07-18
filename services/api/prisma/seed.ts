import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLES: Array<{ role_name: string; description: string }> = [
  { role_name: 'patient', description: 'Seeks care: symptom intake, records, appointments' },
  { role_name: 'doctor', description: 'Provides care: consultations, prescriptions, patient review' },
  { role_name: 'hospital', description: 'Manages facility operations: queue, beds, incoming cases' },
  { role_name: 'admin', description: 'Platform administration: users, institutions, configuration' },
];

const SPECIALIZATIONS: Array<{ specialization_name: string; description: string }> = [
  { specialization_name: 'General Medicine', description: 'General/internal medicine' },
  { specialization_name: 'Emergency Medicine', description: 'Emergency and trauma care' },
  { specialization_name: 'Cardiology', description: 'Heart and cardiovascular care' },
  { specialization_name: 'Orthopedics', description: 'Bones, joints, and musculoskeletal care' },
  { specialization_name: 'Pediatrics', description: 'Child and adolescent care' },
];

// Fictional demo hospitals clustered near a single demo location so ETA
// (haversine distance) produces a meaningful spread for the ranking engine
// to differentiate on. Not modeled on any real facility.
const HOSPITALS: Array<{
  name: string;
  hospital_type: 'GOVERNMENT' | 'PRIVATE' | 'TRUST' | 'MILITARY' | 'SPECIALTY';
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  emergency_supported: boolean;
  verified: boolean;
  reliability_score: number;
  accepted_insurance_providers: string[];
  specialties: string[];
  status: {
    available_beds: number;
    total_beds: number;
    available_icu: number;
    total_icu: number;
    available_doctors: number;
    total_doctors: number;
    emergency_load: number;
    queue_load: number;
    ventilators_available: number;
  };
}> = [
  {
    name: 'City General Hospital',
    hospital_type: 'GOVERNMENT',
    city: 'Rivertown',
    state: 'RT',
    latitude: 28.6100,
    longitude: 77.2100,
    emergency_supported: true,
    verified: true,
    reliability_score: 0.75,
    accepted_insurance_providers: [],
    specialties: ['General Medicine', 'Emergency Medicine', 'Pediatrics'],
    status: {
      available_beds: 40,
      total_beds: 200,
      available_icu: 5,
      total_icu: 20,
      available_doctors: 12,
      total_doctors: 30,
      emergency_load: 18,
      queue_load: 22,
      ventilators_available: 4,
    },
  },
  {
    name: 'Northside Heart & Ortho Specialty Centre',
    hospital_type: 'SPECIALTY',
    city: 'Rivertown',
    state: 'RT',
    latitude: 28.6450,
    longitude: 77.1850,
    emergency_supported: false,
    verified: true,
    reliability_score: 0.92,
    accepted_insurance_providers: ['HealthCo', 'MediSure'],
    specialties: ['Cardiology', 'Orthopedics'],
    status: {
      available_beds: 15,
      total_beds: 60,
      available_icu: 3,
      total_icu: 10,
      available_doctors: 8,
      total_doctors: 15,
      emergency_load: 0,
      queue_load: 6,
      ventilators_available: 2,
    },
  },
  {
    name: 'Riverside Private Hospital',
    hospital_type: 'PRIVATE',
    city: 'Rivertown',
    state: 'RT',
    latitude: 28.5800,
    longitude: 77.2450,
    emergency_supported: true,
    verified: true,
    reliability_score: 0.85,
    accepted_insurance_providers: ['HealthCo', 'CarePlus', 'MediSure'],
    specialties: ['General Medicine', 'Emergency Medicine', 'Cardiology'],
    status: {
      available_beds: 25,
      total_beds: 120,
      available_icu: 8,
      total_icu: 15,
      available_doctors: 20,
      total_doctors: 40,
      emergency_load: 9,
      queue_load: 10,
      ventilators_available: 6,
    },
  },
  {
    name: 'Trust Community Medical Center',
    hospital_type: 'TRUST',
    city: 'Rivertown',
    state: 'RT',
    latitude: 28.6700,
    longitude: 77.2700,
    emergency_supported: true,
    verified: false,
    reliability_score: 0.65,
    accepted_insurance_providers: [],
    specialties: ['General Medicine', 'Pediatrics'],
    status: {
      available_beds: 10,
      total_beds: 50,
      available_icu: 1,
      total_icu: 5,
      available_doctors: 5,
      total_doctors: 12,
      emergency_load: 6,
      queue_load: 15,
      ventilators_available: 1,
    },
  },
  {
    name: 'Lakeside Military Health Facility',
    hospital_type: 'MILITARY',
    city: 'Rivertown',
    state: 'RT',
    latitude: 28.5500,
    longitude: 77.1600,
    emergency_supported: false,
    verified: true,
    reliability_score: 0.88,
    accepted_insurance_providers: [],
    specialties: ['General Medicine', 'Orthopedics'],
    status: {
      available_beds: 8,
      total_beds: 40,
      available_icu: 2,
      total_icu: 8,
      available_doctors: 6,
      total_doctors: 14,
      emergency_load: 1,
      queue_load: 3,
      ventilators_available: 2,
    },
  },
];

async function main() {
  for (const role of ROLES) {
    await prisma.roles.upsert({
      where: { role_name: role.role_name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);

  const specializationIds = new Map<string, number>();
  for (const spec of SPECIALIZATIONS) {
    const row = await prisma.doctor_specializations.upsert({
      where: { specialization_name: spec.specialization_name },
      update: { description: spec.description },
      create: spec,
    });
    specializationIds.set(spec.specialization_name, row.id);
  }
  console.log(`Seeded ${SPECIALIZATIONS.length} specializations.`);

  for (const h of HOSPITALS) {
    const existing = await prisma.hospitals.findFirst({ where: { name: h.name } });
    const hospital = existing
      ? await prisma.hospitals.update({
          where: { id: existing.id },
          data: {
            hospital_type: h.hospital_type,
            city: h.city,
            state: h.state,
            latitude: h.latitude,
            longitude: h.longitude,
            emergency_supported: h.emergency_supported,
            verified: h.verified,
            reliability_score: h.reliability_score,
            accepted_insurance_providers: h.accepted_insurance_providers,
          },
        })
      : await prisma.hospitals.create({
          data: {
            name: h.name,
            hospital_type: h.hospital_type,
            city: h.city,
            state: h.state,
            latitude: h.latitude,
            longitude: h.longitude,
            emergency_supported: h.emergency_supported,
            verified: h.verified,
            reliability_score: h.reliability_score,
            accepted_insurance_providers: h.accepted_insurance_providers,
          },
        });

    await prisma.hospital_operational_status.upsert({
      where: { hospital_id: hospital.id },
      update: h.status,
      create: { hospital_id: hospital.id, ...h.status },
    });

    await prisma.hospital_specialties.deleteMany({ where: { hospital_id: hospital.id } });
    for (const specName of h.specialties) {
      const specId = specializationIds.get(specName);
      if (specId) {
        await prisma.hospital_specialties.create({
          data: { hospital_id: hospital.id, specialization_id: specId },
        });
      }
    }
  }
  console.log(`Seeded ${HOSPITALS.length} hospitals with operational status and specialties.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
