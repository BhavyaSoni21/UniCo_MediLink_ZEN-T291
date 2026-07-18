import '@/lib/load-env';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyNeonWebhook } from '@/lib/neon-webhook';

// Resend is constructed lazily (not at module scope) so this route doesn't
// throw during Next.js's build-time page-data collection, which evaluates
// route modules in an isolated context without our env vars loaded.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
    const payload = await verifyNeonWebhook(rawBody, request.headers);
    const { event_type, event_data, user } = payload;

    switch (event_type) {
      case 'send.otp':
        await sendOtpEmail(user.email, event_data.otp_code as string);
        break;
      case 'send.magic_link':
        await sendMagicLinkEmail(user.email, event_data.link_url as string);
        break;
      default:
        console.log(`neon webhook: unhandled event_type ${event_type}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('neon webhook error:', message);
    return NextResponse.json({ error: message }, { status: message.includes('signature') ? 400 : 500 });
  }
}

async function sendOtpEmail(to: string, otpCode: string) {
  const { data, error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Your MediLink verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2>MediLink</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px;">
          ${otpCode}
        </p>
        <p>This code expires in a few minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  if (error) {
    // Resend's SDK never throws on API errors — it always returns
    // { data, error } — so a rejected send would otherwise look
    // identical to a successful one.
    throw new Error(`Resend rejected OTP email to ${to}: ${error.message}`);
  }
  console.log(`neon webhook: sent OTP email to ${to} (resend id ${data?.id})`);
}

async function sendMagicLinkEmail(to: string, linkUrl: string) {
  const { data, error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Your MediLink sign-in link',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2>MediLink</h2>
        <p><a href="${linkUrl}">Click here to continue</a></p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  if (error) {
    throw new Error(`Resend rejected magic-link email to ${to}: ${error.message}`);
  }
  console.log(`neon webhook: sent magic-link email to ${to} (resend id ${data?.id})`);
}
