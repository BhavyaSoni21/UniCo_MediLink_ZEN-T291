// StorageModule is @Global(), so every e2e test that boots the full
// AppModule pulls in StorageService, whose real onModuleInit would otherwise
// make a genuine network call to MinIO. Tests override StorageService with
// this stub, mirroring how PrismaService/TOKEN_VERIFIER are stubbed.
export function createMockStorageService() {
  return {
    onModuleInit: jest.fn(),
    buildObjectKey: jest.fn(
      (patientId: string, namespace: string, fileName: string) =>
        `patients/${patientId}/${namespace}/mock-${fileName}`,
    ),
    putObject: jest.fn(),
    getPresignedUrl: jest.fn(
      (objectKey: string) => `https://mock-storage.local/${objectKey}`,
    ),
    removeObject: jest.fn(),
  };
}
