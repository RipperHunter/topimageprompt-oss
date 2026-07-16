/**
 * lib/image-processor.js
 *
 * Shared image processing helper extracted from /api/upload/route.js.
 * Used by both the single-upload route and the bulk-import route so
 * all images go through the same sharp → WebP → R2/local pipeline.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

sharp.concurrency(1);
sharp.cache(false);

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|tiff|avif)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_INPUT_PIXELS = 40_000_000;

function getLocalUploadsDir() {
  const configuredDir = process.env.LOCAL_UPLOADS_DIR?.trim();
  if (configuredDir && path.isAbsolute(configuredDir)) return configuredDir;

  return path.join(process.cwd(), 'public', 'uploads');
}

const hasS3Config = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_ENDPOINT &&
  process.env.R2_BUCKET_NAME
);

let s3Client = null;
if (hasS3Config) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Validate a buffer/filename for type and size.
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {{ valid: boolean, error?: string }}
 */
export async function validateImage(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { valid: false, error: 'Image file is empty' };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max 10MB)` };
  }
  if (!ALLOWED_EXTENSIONS.test(filename)) {
    return { valid: false, error: `Unsupported image type: ${path.extname(filename) || 'unknown'}` };
  }
  try {
    const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' }).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      return { valid: false, error: 'The uploaded bytes are not a supported image' };
    }
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
      return { valid: false, error: 'Image dimensions are too large (max 40 megapixels)' };
    }
    return { valid: true, format: metadata.format };
  } catch {
    return { valid: false, error: 'The uploaded file is corrupt or is not a valid image' };
  }
}

/**
 * Process an image buffer and store it via R2 (if configured) or local filesystem.
 *
 * @param {Buffer} buffer   Raw image bytes
 * @param {string} filename  Original filename (used for extension detection only)
 * @returns {Promise<{ imageUrl: string, originalUrl: string }>}
 */
export async function processAndStoreImage(buffer, filename) {
  const validation = await validateImage(buffer, filename);
  if (!validation.valid) throw new Error(validation.error);

  const timestamp = Date.now();
  const randomId = randomUUID().slice(0, 8);
  const ext = path.extname(filename) || '.jpg';
  const safeName = path.basename(filename, ext).replace(/[^a-zA-Z0-9._-]/g, '_');

  const originalBasename = `${safeName}_${timestamp}_${randomId}_original.webp`;
  const displayBasename = `${safeName}_${timestamp}_${randomId}.webp`;

  // Never publish the raw upload. Re-encoding strips EXIF/GPS metadata and any
  // non-image payload while retaining a high-resolution archival rendition.
  const originalBuffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' })
    .rotate()
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 95 })
    .toBuffer();

  // Build compressed WebP display buffer
  const displayBuffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'warning' })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  let imageUrl, originalUrl;

  if (hasS3Config && s3Client) {
    // Cloud storage (Cloudflare R2 / S3)
    const s3Bucket = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}/${s3Bucket}`;

    const originalKey = `uploads/originals/${originalBasename}`;
    const displayKey = `uploads/display/${displayBasename}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: originalKey,
      Body: originalBuffer,
      ContentType: 'image/webp',
    }));

    await s3Client.send(new PutObjectCommand({
      Bucket: s3Bucket,
      Key: displayKey,
      Body: displayBuffer,
      ContentType: 'image/webp',
    }));

    imageUrl = `${publicBaseUrl}/${displayKey}`;
    originalUrl = `${publicBaseUrl}/${originalKey}`;
  } else {
    // Local filesystem fallback
    // Use LOCAL_UPLOADS_DIR in production when the deployment filesystem is
    // ephemeral or uploads must live on a persistent mounted volume.
    const baseDir = getLocalUploadsDir();
    const originalsDir = path.join(baseDir, 'originals');
    const displayDir = path.join(baseDir, 'display');

    await mkdir(originalsDir, { recursive: true });
    await mkdir(displayDir, { recursive: true });

    await writeFile(path.join(originalsDir, originalBasename), originalBuffer);
    await writeFile(path.join(displayDir, displayBasename), displayBuffer);

    imageUrl = `/uploads/display/${displayBasename}`;
    originalUrl = `/uploads/originals/${originalBasename}`;
  }

  return { imageUrl, originalUrl };
}
