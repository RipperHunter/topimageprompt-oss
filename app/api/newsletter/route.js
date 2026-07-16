import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { cleanString, isEmail, rateLimit, readJsonObject } from '../../../lib/api-security';

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'newsletter', limit: 10, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const email = cleanString(body.email, 254)?.toLowerCase();
    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { status: 'Subscribed' },
      create: { email },
    });

    return NextResponse.json({ success: true, message: 'Subscribed successfully' }, { status: 201 });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
