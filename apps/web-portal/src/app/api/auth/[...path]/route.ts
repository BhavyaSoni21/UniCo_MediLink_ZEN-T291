// Neon Auth proxy routes are no longer needed — auth is handled locally.
export function GET() {
  return new Response(null, { status: 404 });
}
export function POST() {
  return new Response(null, { status: 404 });
}
