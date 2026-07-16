import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { cleanOptionalString, rateLimit, readJsonObject } from '../../../../lib/api-security';

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'analytics', limit: 120, windowMs: 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const eventType = cleanOptionalString(body.eventType, 40) || 'UNKNOWN';
    const promptId = cleanOptionalString(body.promptId, 80);
    const source = cleanOptionalString(body.source, 80) || 'Direct';
    const allowedEvents = new Set(['copy_prompt', 'page_view', 'save_prompt', 'UNKNOWN']);
    if (!allowedEvents.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }
    
    // Save the event
    await prisma.analyticsEvent.create({
      data: {
        eventType: eventType || 'UNKNOWN',
        promptId: promptId || null,
        source: source || 'Direct'
      }
    });

    // If it's a copy event and has a promptId, increment the prompt's copy count
    if (eventType === 'copy_prompt' && promptId) {
      await prisma.prompt.update({
        where: { id: promptId },
        data: { copies: { increment: 1 } }
      }).catch(e => console.error("Error updating prompt copies:", e));
    }

    return NextResponse.json({ success: true, message: "Event tracked" }, { status: 200 });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
  }
}
