import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { cleanOptionalString, readJsonObject } from '../../../../lib/api-security';

// POST — toggle save/unsave a prompt
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const promptId = cleanOptionalString(body.promptId, 80);

    if (!promptId) {
      return NextResponse.json(
        { error: 'promptId is required' },
        { status: 400 }
      )
    }

    const prompt = await prisma.prompt.findFirst({ where: { id: promptId, published: true }, select: { id: true } });
    if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });

    const existing = await prisma.savedPrompt.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: String(promptId)
        }
      }
    });

    if (existing) {
      await prisma.savedPrompt.delete({
        where: { id: existing.id }
      });
      return NextResponse.json({ saved: false });
    } else {
      await prisma.savedPrompt.create({
        data: {
          userId: session.user.id,
          promptId: String(promptId)
        }
      });
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error('Save toggle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
