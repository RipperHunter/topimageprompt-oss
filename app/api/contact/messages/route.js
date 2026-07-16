import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { ADMIN_CACHE_HEADER, requireAdmin } from '../../../../lib/api-security';

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ messages }, {
      headers: {
        'Cache-Control': ADMIN_CACHE_HEADER
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const msg = await prisma.contactMessage.update({
      where: { id },
      data: { status: 'Read' }
    });
    
    return NextResponse.json({ success: true, message: msg }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER }
    });
  } catch(e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.contactMessage.delete({ where: { id } });
    
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER }
    });
  } catch(e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
