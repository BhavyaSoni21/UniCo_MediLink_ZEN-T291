import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Client } from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = new URL(
      process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    );
    this.bucket = process.env.MINIO_BUCKET ?? 'medilink-reports';
    this.client = new Client({
      endPoint: endpoint.hostname,
      port:
        Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
      useSSL: endpoint.protocol === 'https:',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket "${this.bucket}"`);
      }
    } catch (err) {
      // Racing another instance's bucket creation (or a stale bucketExists
      // check) is fine — the bucket ending up present is all that matters.
      const code = (err as { code?: string })?.code;
      if (
        code === 'BucketAlreadyOwnedByYou' ||
        code === 'BucketAlreadyExists'
      ) {
        return;
      }
      // MinIO being unreachable at boot shouldn't take down the whole API —
      // most endpoints (auth, patient profile/history minus photo, etc.)
      // don't touch storage at all. Log loudly and let file-upload calls
      // fail individually instead of blocking every other route.
      this.logger.error(
        `MinIO unavailable at startup — file upload/download will fail until it's reachable: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  buildObjectKey(
    patientId: string,
    namespace: string,
    fileName: string,
  ): string {
    return `patients/${patientId}/${namespace}/${randomUUID()}-${fileName}`;
  }

  async putObject(
    objectKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async getPresignedUrl(
    objectKey: string,
    expirySeconds = 300,
  ): Promise<string> {
    return this.client.presignedGetObject(
      this.bucket,
      objectKey,
      expirySeconds,
    );
  }

  async removeObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }
}
