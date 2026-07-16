import { NextResponse } from 'next/server';
import { requireAdmin, rateLimit } from '../../../lib/api-security';
import { processAndStoreImage } from '../../../lib/image-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const limited = rateLimit(request, { namespace: 'admin-upload', limit: 30, windowMs: 10 * 60 * 1000 });
    if (limited) return limited;

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_FILE_SIZE + 1024 * 1024) {
      return NextResponse.json({ error: 'File must be 10MB or smaller' }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be between 1 byte and 10MB' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { imageUrl, originalUrl } = await processAndStoreImage(buffer, file.name || 'upload.jpg');

    return NextResponse.json({
      url: imageUrl,
      imageUrl,
      originalUrl,
      storage: process.env.R2_BUCKET_NAME ? 's3' : 'local',
    });
  } catch (error) {
    console.error('[upload] Rejected upload:', error.message);
    const status = /image|file|large|corrupt|supported|dimensions/i.test(error.message) ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? error.message : 'Upload failed' }, { status });
  }
}
