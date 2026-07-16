import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  ADMIN_CACHE_HEADER,
  cleanString,
  rateLimit,
  readJsonObject,
  requireUser,
} from '../../../lib/api-security';

export async function GET(request) {
  try {
    const { token, error: authError } = await requireUser(request);
    if (authError) return authError;

    const keys = await prisma.apiKey.findMany({
      where: { userId: token.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        rateLimit: true,
        requests: true,
        createdAt: true
      }
    });

    return NextResponse.json({ keys }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER }
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { token, error: authError } = await requireUser(request);
    if (authError) return authError;

    const limited = rateLimit(request, {
      namespace: 'api-key-create',
      key: token.id,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (limited) return limited;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const name = cleanString(body.name, 80);
    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const existingKeyCount = await prisma.apiKey.count({ where: { userId: token.id } });
    if (existingKeyCount >= 10) {
      return NextResponse.json({ error: 'Revoke an existing key before creating another' }, { status: 409 });
    }

    // Generate secure plain-text key starting with pv_ as expected by audit
    const randomHex = crypto.randomBytes(32).toString('hex');
    const rawKey = `pv_${randomHex}`;
    
    // Store only the first 8 characters for display prefix (e.g. "pv_abc12")
    const prefix = rawKey.substring(0, 8);
    
    // Hash the key using bcryptjs for secure database storage
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        prefix,
        userId: token.id,
        rateLimit: 10 // Rate limit set to 10 requests / hour as requested by spec
      }
    });

    return NextResponse.json({
      success: true,
      key: rawKey, // Render plain-text raw key ONCE
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        rateLimit: apiKey.rateLimit,
        requests: apiKey.requests,
        createdAt: apiKey.createdAt
      }
    }, { status: 201, headers: { 'Cache-Control': ADMIN_CACHE_HEADER } });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
