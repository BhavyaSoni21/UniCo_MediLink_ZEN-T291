// Every e2e test that boots the full AppModule pulls in the @Global()
// PrismaModule, whose real PrismaService would otherwise try a genuine
// Neon connection via Prisma's WASM query engine on module init — which
// needs --experimental-vm-modules under Jest and isn't something CI has
// a database for anyway. Tests override PrismaService with this stub.
export function createMockPrismaService() {
  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    // $transaction supports both the array form (Promise.all) and the
    // interactive callback form `$transaction(async (tx) => {...})` — the
    // callback is invoked with this same mock so `tx.patients.update(...)`
    // etc. hit the same jest.fn() stubs the test configures.
    $transaction: jest.fn(),
    roles: { findUnique: jest.fn() },
    users: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    patients: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    addresses: { upsert: jest.fn() },
    emergency_contacts: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    medical_conditions: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    allergies: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    medications: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    insurances: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    medical_records: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    medical_files: { create: jest.fn(), findMany: jest.fn() },
    consents: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    record_access_logs: { create: jest.fn(), findMany: jest.fn() },
    triage_sessions: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    symptoms: { deleteMany: jest.fn(), createMany: jest.fn() },
    vitals_readings: { create: jest.fn() },
    hospitals: { findMany: jest.fn(), findUnique: jest.fn() },
    doctor_specializations: { findUnique: jest.fn(), findMany: jest.fn() },
    hospital_operational_status: { findUnique: jest.fn(), upsert: jest.fn() },
    hospital_recommendations: { create: jest.fn(), findUnique: jest.fn() },
    doctors: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    doctor_schedules: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    appointments: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    queue_entries: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    medicines: { findMany: jest.fn(), findUnique: jest.fn() },
    pharmacies: { findMany: jest.fn(), findUnique: jest.fn() },
    pharmacy_inventory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    medicine_reservations: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  mockPrisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: typeof mockPrisma) => unknown)(mockPrisma)
      : Promise.all(arg as Promise<unknown>[]),
  );

  return mockPrisma;
}
