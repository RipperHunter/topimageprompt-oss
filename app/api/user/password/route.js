import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { rateLimit, readJsonObject } from '../../../../lib/api-security';

export async function PATCH(request) {
  try {
    const limited = rateLimit(request, { namespace: 'password-change', limit: 5, windowMs: 15 * 60 * 1000 });
    if (limited) return limited;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { error: 'Password must be between 8 and 128 characters' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true }
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: 'User record invalid' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(
      currentPassword,
      user.hashedPassword
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword }
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
