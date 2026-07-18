import { config } from 'dotenv';
import { resolve } from 'node:path';

// The repo keeps a single .env at the root; Next.js only auto-loads env
// files from its own app directory. Every server-side module that reads
// root-level env vars (Auth_URL, JWKS_URL, RESEND_API_KEY, ...) imports
// this first rather than relying on another module happening to load
// first — Next's build-time page-data collection evaluates route modules
// in isolated contexts where that ordering doesn't hold.
config({ path: resolve(process.cwd(), '../../.env') });
