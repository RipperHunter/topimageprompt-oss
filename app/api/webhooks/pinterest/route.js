import { NextResponse } from 'next/server';
import { cleanOptionalString, readJsonObject } from '../../../../lib/api-security';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const expectedSecret = process.env.PINTEREST_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
    }
    const receivedSecret = request.headers.get('x-webhook-secret') || '';
    const expectedBuffer = Buffer.from(expectedSecret);
    const receivedBuffer = Buffer.from(receivedSecret);
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 401 });
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const promptId = cleanOptionalString(body.promptId, 80);
    const imageUrl = cleanOptionalString(body.imageUrl, 2048);
    const title = cleanOptionalString(body.title, 160);
    const promptText = cleanOptionalString(body.promptText, 8000);
    if (!promptId || !imageUrl || !title || !promptText) {
      return NextResponse.json({ error: "promptId, imageUrl, title, and promptText are required" }, { status: 400 });
    }
    
    // In Phase 15 Production:
    // 1. Authenticate with Pinterest OAuth / API Key
    // 2. Upload Image to Pinterest API
    // 3. Set description to promptText and link to topimageprompt canonical URL
    
    // Simulated Webhook Response
    console.log(`[Webhook] Simulated Pinterest Pin created for Prompt: ${title}`);

    return NextResponse.json({
      success: true,
      message: "Prompt successfully pinned to Pinterest board",
      pinterestData: {
        pinId: "pin_" + Date.now(),
        board: "topimageprompt — AI Prompts",
        url: `https://pinterest.com/pin/mock_${promptId}`
      }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 401 });
  }
}
