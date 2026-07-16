import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { cleanOptionalString, readJsonObject } from '../../../../lib/api-security';
import { isSafeHttpUrl } from '../../../../lib/seo';

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const { emailNotifications, publicProfile } = body;
    const name = cleanOptionalString(body.name, 120);
    const avatar = cleanOptionalString(body.avatar, 2048);

    if (avatar && !avatar.startsWith('/uploads/') && (!isSafeHttpUrl(avatar) || !avatar.startsWith('https://'))) {
      return NextResponse.json({ error: 'Avatar must be an HTTPS URL or an uploaded image' }, { status: 400 });
    }

    if (body.name !== undefined && name === null) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
        ...(publicProfile !== undefined && { publicProfile: Boolean(publicProfile) }),
      },
      select: { 
        id: true, 
        name: true, 
        avatar: true, 
        emailNotifications: true, 
        publicProfile: true 
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
