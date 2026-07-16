import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { ADMIN_CACHE_HEADER, requireUser } from '../../../../lib/api-security';

export async function DELETE(request, { params }) {
  try {
    const { token, error: authError } = await requireUser(request);
    if (authError) return authError;

    const { id } = await params;

    // Check if key exists and belongs to user
    const key = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    if (key.userId !== token.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete key
    await prisma.apiKey.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Key revoked' }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER }
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
