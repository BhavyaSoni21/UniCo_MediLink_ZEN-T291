import '@/lib/load-env';
import crypto from 'node:crypto';

interface NeonWebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  user: {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
  };
  event_data: Record<string, unknown>;
}

let cachedJwks: { keys: Array<{ kid: string; [key: string]: unknown }> } | null = null;

async function getJwks() {
  if (!cachedJwks) {
    const res = await fetch(`${process.env.JWKS_URL}`);
    cachedJwks = (await res.json()) as typeof cachedJwks;
  }
  return cachedJwks!;
}

/**
 * Verifies a Neon Auth webhook request (detached Ed25519 JWS over
 * `${timestamp}.${base64url(rawBody)}`) and returns the parsed payload.
 * The raw body must be the exact bytes Neon signed — re-serializing
 * JSON before calling this breaks verification.
 */
export async function verifyNeonWebhook(
  rawBody: string,
  headers: Headers,
): Promise<NeonWebhookPayload> {
  const signature = headers.get('x-neon-signature');
  const kid = headers.get('x-neon-signature-kid');
  const timestamp = headers.get('x-neon-timestamp');

  if (!signature || !kid || !timestamp) {
    throw new Error('Missing required Neon webhook signature headers');
  }

  const jwks = await getJwks();
  let jwk = jwks.keys.find((k) => k.kid === kid);
  if (!jwk) {
    // Key rotated since our last fetch — refresh once and retry.
    cachedJwks = null;
    jwk = (await getJwks()).keys.find((k) => k.kid === kid);
  }
  if (!jwk) {
    throw new Error(`Signing key ${kid} not found in JWKS`);
  }

  const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });

  const [headerB64, emptyPayload, signatureB64] = signature.split('.');
  if (emptyPayload !== '' || !headerB64 || !signatureB64) {
    throw new Error('Expected detached JWS format in x-neon-signature');
  }

  const payloadB64 = Buffer.from(rawBody, 'utf8').toString('base64url');
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, 'utf8').toString('base64url');
  const signingInput = `${headerB64}.${signaturePayloadB64}`;

  const isValid = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, 'base64url'),
  );
  if (!isValid) {
    throw new Error('Invalid Neon webhook signature');
  }

  const ageMs = Date.now() - parseInt(timestamp, 10);
  if (Number.isNaN(ageMs) || ageMs > 5 * 60 * 1000 || ageMs < -60 * 1000) {
    throw new Error('Neon webhook timestamp is stale or invalid');
  }

  return JSON.parse(rawBody) as NeonWebhookPayload;
}
