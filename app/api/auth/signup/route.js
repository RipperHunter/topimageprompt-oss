import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { cleanString, isEmail, rateLimit, readJsonObject } from "../../../../lib/api-security";

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'signup', limit: 10, windowMs: 10 * 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const email = cleanString(body.email, 254)?.toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const name = cleanString(body.name, 120);
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters" }, { status: 400 });
    }
    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "A valid 6-digit verification code is required" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Find the OTP record
    const record = await prisma.emailVerification.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      await prisma.emailVerification.deleteMany({ where: { email } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, record.otp);
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect verification code. Please try again." }, { status: 400 });
    }

    // OTP is valid - create user and clean up
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: name || email.split("@")[0],
        role: "USER",
      },
    });

    await prisma.emailVerification.deleteMany({ where: { email } });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
