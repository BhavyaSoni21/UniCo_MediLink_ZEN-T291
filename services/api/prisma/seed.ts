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

async function main() {
  for (const role of ROLES) {
    await prisma.roles.upsert({
      where: { role_name: role.role_name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`Seeded ${ROLES.length} roles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
