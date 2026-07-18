// Every e2e test that boots the full AppModule pulls in the @Global()
// PrismaModule, whose real PrismaService would otherwise try a genuine
// Neon connection via Prisma's WASM query engine on module init — which
// needs --experimental-vm-modules under Jest and isn't something CI has
// a database for anyway. Tests override PrismaService with this stub.
export function createMockPrismaService() {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    roles: { findUnique: jest.fn() },
    users: { findUnique: jest.fn(), upsert: jest.fn() },
  };
}
