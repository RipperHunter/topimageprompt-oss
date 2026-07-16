import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, rateLimit, readJsonObject } from '../../../../lib/api-security';

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'prompt-copy', limit: 60, windowMs: 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const promptId = cleanOptionalString(body.promptId, 80);
    const source = cleanOptionalString(body.source, 80) || 'Direct';

    if (!promptId) {
      return NextResponse.json({ error: 'promptId is required' }, { status: 400 });
    }

    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId }
    });

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Increment copies counter in Prompt table
    const updatedPrompt = await prisma.prompt.update({
      where: { id: promptId },
      data: { copies: { increment: 1 } }
    });

    // Log copy event in AnalyticsEvent table
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'copy_prompt',
        promptId: promptId,
        source
      }
    });

    revalidatePath(`/prompt/${promptId}`);
    revalidatePath('/trending');

    return NextResponse.json({
      success: true,
      copies: updatedPrompt.copies
    });
  } catch (error) {
    console.error('Error tracking prompt copy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
