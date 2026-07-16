import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { cleanOptionalString, readJsonObject } from '../../../lib/api-security';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;
    const promptId = cleanOptionalString(body.promptId, 80);
    const collectionId = cleanOptionalString(body.collectionId, 80);

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID is required' }, { status: 400 });
    }

    const [prompt, collection] = await Promise.all([
      prisma.prompt.findFirst({ where: { id: promptId, published: true }, select: { id: true } }),
      collectionId ? prisma.collection.findFirst({ where: { id: collectionId, userId: session.user.id }, select: { id: true } }) : null,
    ]);
    if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    if (collectionId && !collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    // Check if save exists
    const existingSave = await prisma.save.findFirst({
      where: {
        userId: session.user.id,
        promptId: promptId,
        collectionId: collectionId || null,
      }
    });

    if (existingSave) {
      // Unsave
      await prisma.save.delete({
        where: { id: existingSave.id }
      });
      return NextResponse.json({ saved: false });
    } else {
      // Save
      await prisma.save.create({
        data: {
          userId: session.user.id,
          promptId: promptId,
          collectionId: collectionId || null,
        }
      });
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
