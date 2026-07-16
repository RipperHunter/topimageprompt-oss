import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { cleanOptionalString, cleanString, isEmail, rateLimit, readJsonObject } from '../../../lib/api-security';

export async function POST(request) {
  try {
    const limited = rateLimit(request, { namespace: 'contact', limit: 5, windowMs: 60 * 60 * 1000 });
    if (limited) return limited;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const name = cleanString(body.name, 120);
    const email = cleanString(body.email, 254)?.toLowerCase();
    const subject = cleanOptionalString(body.subject, 160);
    const message = cleanString(body.message, 4000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 });
    }

    const contactMsg = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject: subject || 'No Subject',
        message,
      },
    });

    return NextResponse.json({ success: true, message: 'Message sent successfully', id: contactMsg.id }, { status: 201 });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
