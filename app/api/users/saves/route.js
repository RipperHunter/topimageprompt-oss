import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saves = await prisma.save.findMany({
      where: { userId: session.user.id, prompt: { published: true } },
      include: { prompt: true },
      orderBy: { createdAt: 'desc' }
    });

    const prompts = saves.map(save => save.prompt);

    return NextResponse.json(
      { prompts },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Fetch saves error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
