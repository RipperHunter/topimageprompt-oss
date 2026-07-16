import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    // 1. Get x-api-key from headers
    const apiKeyHeader = request.headers.get('x-api-key');
    if (!apiKeyHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key' }, { status: 401 });
    }

    // 2. Look up API keys by prefix and verify with bcrypt
    const prefix = apiKeyHeader.substring(0, 8);
    const candidateKeys = await prisma.apiKey.findMany({
      where: { prefix }
    });

    let apiKey = null;
    for (const key of candidateKeys) {
      const isMatch = await bcrypt.compare(apiKeyHeader, key.key);
      if (isMatch) {
        apiKey = key;
        break;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    // 3. Enforce rate limiting
    const now = new Date();
    const windowStart = new Date(apiKey.windowStart);
    const timeDiff = now - windowStart;

    let currentRequests = apiKey.requests;
    let newWindowStart = apiKey.windowStart;

    if (timeDiff > 3600000) { // 1 hour has elapsed
      // Reset rate limit window
      currentRequests = 0;
      newWindowStart = now;
    }

    if (currentRequests >= apiKey.rateLimit) {
      // Still within the current hour, and rate limit exceeded
      return NextResponse.json({
        error: 'Rate limit exceeded',
        limit: apiKey.rateLimit,
        resetTime: new Date(newWindowStart.getTime() + 3600000).toISOString()
      }, { status: 429 });
    }

    // 4. Update request count & rate limit window start if reset
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        requests: currentRequests + 1,
        windowStart: newWindowStart
      }
    });

    // 5. Query prompts (paginated / filterable)
    const { searchParams } = new URL(request.url);
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const parsedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
    const category = searchParams.get('category');
    const engine = searchParams.get('engine');

    const where = { published: true };
    if (category) where.category = category;
    if (engine) where.engine = engine;

    const prompts = await prisma.prompt.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      results: prompts.length,
      limit,
      offset,
      prompts: prompts.map(p => ({
        id: p.id,
        title: p.title,
        promptText: p.promptText,
        engine: p.engine,
        category: p.category,
        aspectRatio: p.aspectRatio,
        imageUrl: p.imageUrl,
        copies: p.copies,
        createdAt: p.createdAt
      })),
      rateLimit: {
        limit: apiKey.rateLimit,
        remaining: apiKey.rateLimit - (currentRequests + 1),
        resetTime: new Date(newWindowStart.getTime() + 3600000).toISOString()
      }
    });
  } catch (error) {
    console.error('Developer API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
