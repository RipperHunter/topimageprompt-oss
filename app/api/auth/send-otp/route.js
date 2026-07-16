import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { cleanString, isEmail, rateLimit, readJsonObject } from "../../../../lib/api-security";
import { BRAND_NAME } from "../../../../lib/brand";
import { sendTransactionalEmail } from "../../../../lib/email";

const MAX_REQUESTS = 3;
const WINDOW_MS = 10 * 60 * 1000;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'send-otp', limit: 10, windowMs: 10 * 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const email = cleanString(body.email, 254)?.toLowerCase();
    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const emailLimited = rateLimit(request, {
      namespace: 'send-otp-email',
      key: email,
      limit: MAX_REQUESTS,
      windowMs: WINDOW_MS,
    });
    if (emailLimited) return emailLimited;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    await prisma.emailVerification.deleteMany({ where: { email } });

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email, otp: hashedOtp, expiresAt },
    });

    if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM) {
      console.error("[send-otp] EMAIL_API_KEY or EMAIL_FROM not configured");
      return NextResponse.json({ error: "Email service is not configured. Contact support." }, { status: 500 });
    }

    await sendTransactionalEmail({
      to: email,
      subject: `Your verification code for ${BRAND_NAME}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#09090b;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#640DF0,#FE42B4);padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.03em;">${BRAND_NAME}</h1>
          </div>
          <div style="padding:40px 32px;background:#09090b;">
            <h2 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 8px;">Verify your email address</h2>
            <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 32px;">
              Use the code below to complete your account creation. This code expires in <strong style="color:#f4f4f5;">10 minutes</strong>.
            </p>
            <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
              <div style="font-size:46px;font-weight:900;letter-spacing:0.2em;color:#ffffff;font-family:monospace;">${otp}</div>
            </div>
            <p style="color:#71717a;font-size:13px;margin:0;">If you did not request this, you can safely ignore this email.</p>
          </div>
          <div style="background:#18181b;padding:20px 32px;text-align:center;">
            <p style="color:#52525b;font-size:12px;margin:0;">&copy; 2026 ${BRAND_NAME}. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[send-otp] Error:", error);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }
}
