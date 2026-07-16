import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { readJsonObject, requireAdmin } from '../../../../lib/api-security';

export async function PUT(request, { params }) {
  try {
    const { token, error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const { role } = body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Role must be USER or ADMIN' }, { status: 400 });
    }

    // Prevent admin from changing their own role (security: avoid accidental self-demotion)
    if (id === token.id) {
      return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { token, error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    
    // Prevent admin from deleting themselves
    if (id === token.id) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
