import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ saved: false });
    }

    const { promptId } = await params;

    const existingSave = await prisma.savedPrompt.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId: promptId,
        }
      }
    });

    return NextResponse.json({ saved: !!existingSave });
  } catch (error) {
    return NextResponse.json({ saved: false });
  }
}
