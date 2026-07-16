import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET — fetch saved prompts for logged in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const saved = await prisma.savedPrompt.findMany({
      where: { userId: session.user.id, prompt: { published: true } },
      include: {
        prompt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const prompts = saved
      .filter(s => s.prompt !== null)
      .map(s => ({
        ...s.prompt,
        copyCount: s.prompt.copies,
        style: s.prompt.category
      }));

    return NextResponse.json(
      prompts,
      { 
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } 
      }
    );
  } catch (error) {
    console.error('Error fetching saved prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
