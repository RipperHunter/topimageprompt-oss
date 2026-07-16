/**
 * POST /api/admin/prompts/bulk-import
 *
 * Accepts a multipart/form-data upload containing a `package.zip` file.
 * The ZIP must contain:
 *   - manifest.json  (array of manifest items)
 *   - image files referenced by manifest[].image_filename
 *
 * Returns { jobId } immediately (202 Accepted) and processes asynchronously.
 * Poll GET /api/admin/prompts/import-jobs/:id for progress.
 *
 * Manifest item schema:
 *   external_id      string  (required, unique idempotency key)
 *   title            string  (required)
 *   prompt           string  (required)
 *   engine           string  (required)
 *   category         string  (required)
 *   aspect_ratio     string  (optional, default '16:9')
 *   tags             string[] (optional)
 *   image_filename   string  (required, filename inside ZIP)
 *   publish          boolean (optional, default true)
 */

import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../../lib/api-security';
import { createJob, updateJob, recordSuccess, recordFailure } from '../../../../../lib/import-jobs';
import { validateImage, processAndStoreImage } from '../../../../../lib/image-processor';
import { generateUniquePromptSlug } from '../../../../../lib/slug';
import prisma from '../../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { unzipSync } from 'fflate';
import { BRAND_URL } from '../../../../../lib/brand';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 250;
const REQUIRED_FIELDS = ['external_id', 'title', 'prompt', 'engine', 'category', 'image_filename'];

/**
 * Ensure a category exists in the DB, creating it if it doesn't.
 * Returns the canonical category name.
 */
async function upsertCategory(name) {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return 'General';
  const existing = await prisma.category.findFirst({
    where: { name: { equals: trimmed } },
    select: { name: true },
  });
  if (existing) return existing.name;
  try {
    const created = await prisma.category.create({
      data: {
        name: trimmed,
        slug: slugify(trimmed),
        groupType: 'Style',
        status: 'Active',
      },
    });
    return created.name;
  } catch {
    // Race condition: another concurrent item created it
    const retry = await prisma.category.findFirst({ where: { name: { equals: trimmed } }, select: { name: true } });
    return retry?.name ?? 'General';
  }
}

/**
 * Normalise and sanitise tags array from manifest.
 */
function normaliseTags(rawTags) {
  if (!Array.isArray(rawTags)) return '[]';
  const cleaned = [...new Set(
    rawTags
      .map(t => String(t).replace(/^#+/, '').trim().toLowerCase())
      .filter(t => t.length > 0 && t.length <= 80)
  )].slice(0, 30);
  return JSON.stringify(cleaned);
}

/**
 * Process a single manifest item. Returns { promptId, slug, url } or throws.
 */
async function processItem(item, imageBuffer, publishOverride) {
  const category = await upsertCategory(item.category || 'General');
  const { imageUrl, originalUrl } = await processAndStoreImage(imageBuffer, item.image_filename);
  const publish = publishOverride !== undefined ? publishOverride : (item.publish !== false);

  const tagsJson = normaliseTags(item.tags);
  const aspectRatio = (item.aspect_ratio || '16:9').trim().slice(0, 24);
  const title = String(item.title).trim().slice(0, 160);
  const promptText = String(item.prompt).trim().slice(0, 8000);
  const engine = String(item.engine).trim().slice(0, 80);
  const externalId = String(item.external_id).trim().slice(0, 191);

  // Check if this externalId already exists (idempotency)
  const existing = await prisma.prompt.findUnique({
    where: { externalId },
    select: { id: true, slug: true },
  });

  let prompt;
  if (existing) {
    // Update existing prompt
    prompt = await prisma.prompt.update({
      where: { id: existing.id },
      data: {
        title,
        promptText,
        engine,
        category,
        aspectRatio,
        imageUrl,
        originalImageUrl: originalUrl,
        published: publish,
        tags: tagsJson,
      },
      select: { id: true, slug: true },
    });
  } else {
    // Create new prompt
    const slug = await generateUniquePromptSlug(title);
    prompt = await prisma.prompt.create({
      data: {
        title,
        slug,
        externalId,
        promptText,
        engine,
        category,
        aspectRatio,
        imageUrl,
        originalImageUrl: originalUrl,
        published: publish,
        tags: tagsJson,
      },
      select: { id: true, slug: true },
    });
  }

  return {
    promptId: prompt.id,
    slug: prompt.slug,
    url: `${BRAND_URL}/prompt/${prompt.slug || prompt.id}`,
  };
}

/**
 * Background async processing function (fire-and-forget from the route handler).
 */
async function processImportJob(jobId, manifest, imageMap, publishOverride) {
  updateJob(jobId, { status: 'running' });

  for (const item of manifest) {
    const externalId = String(item.external_id || '').trim();
    const imageFilename = String(item.image_filename || '').trim();

    try {
      // Validate required fields
      for (const field of REQUIRED_FIELDS) {
        if (!item[field] && item[field] !== false) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Get image buffer from ZIP — try exact path first, then basename
      const imageBuffer = imageMap.get(imageFilename) ?? imageMap.get(imageFilename.replace(/.*\//, ''));
      if (!imageBuffer) {
        throw new Error(`Image not found in ZIP: ${imageFilename}`);
      }

      // Validate image
      const { valid, error: imgError } = await validateImage(imageBuffer, imageFilename);
      if (!valid) throw new Error(imgError);

      const result = await processItem(item, imageBuffer, publishOverride);
      recordSuccess(jobId, externalId, result);
    } catch (err) {
      recordFailure(jobId, externalId, imageFilename, err.message || String(err));
    }
  }

  updateJob(jobId, { status: 'complete' });

  // Revalidate key pages after import completes
  try {
    revalidatePath('/admin/library');
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath('/trending');
    revalidatePath('/sitemap.xml');
  } catch { /* ignore revalidation errors */ }
}

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    // Parse multipart form data
    const formData = await request.formData();
    const zipFile = formData.get('package.zip') || formData.get('file');
    const publishOverrideRaw = formData.get('publish_override');
    const publishOverride = publishOverrideRaw === null
      ? undefined
      : publishOverrideRaw === 'true';

    if (!zipFile || typeof zipFile.arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No ZIP file uploaded. Send a file named "package.zip" or "file".' },
        { status: 400 }
      );
    }

    // Keep compressed and expanded payloads bounded to resist ZIP bombs.
    if (zipFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'ZIP file too large (max 25MB)' }, { status: 413 });
    }

    // Decompress ZIP
    const zipBytes = new Uint8Array(await zipFile.arrayBuffer());
    let files;
    try {
      let expandedBytes = 0;
      let entryCount = 0;
      let rejectedArchive = false;
      files = unzipSync(zipBytes, {
        filter(file) {
          entryCount += 1;
          expandedBytes += file.originalSize || 0;
          const allowedType = file.name === 'manifest.json'
            || file.name.endsWith('/manifest.json')
            || /\.(jpg|jpeg|png|webp|gif|tiff|avif)$/i.test(file.name);
          if (entryCount > 300 || expandedBytes > 150 * 1024 * 1024 || (file.originalSize || 0) > 10 * 1024 * 1024) {
            rejectedArchive = true;
            return false;
          }
          return allowedType;
        },
      });
      if (rejectedArchive) {
        return NextResponse.json({ error: 'ZIP expands beyond the allowed limits' }, { status: 413 });
      }
    } catch (e) {
      return NextResponse.json({ error: `Invalid ZIP file: ${e.message}` }, { status: 400 });
    }

    // Find and parse manifest.json (search root and subdirectories)
    const manifestKey = Object.keys(files).find(k => k === 'manifest.json' || k.endsWith('/manifest.json'));
    if (!manifestKey) {
      return NextResponse.json({ error: 'ZIP must contain a manifest.json file.' }, { status: 400 });
    }
    if (files[manifestKey].byteLength > 1024 * 1024) {
      return NextResponse.json({ error: 'manifest.json must be 1MB or smaller' }, { status: 413 });
    }

    let manifest;
    try {
      const manifestText = new TextDecoder().decode(files[manifestKey]);
      manifest = JSON.parse(manifestText);
    } catch (e) {
      return NextResponse.json({ error: `manifest.json is not valid JSON: ${e.message}` }, { status: 400 });
    }

    if (!Array.isArray(manifest)) {
      return NextResponse.json({ error: 'manifest.json must be a JSON array of items.' }, { status: 400 });
    }

    if (manifest.length === 0) {
      return NextResponse.json({ error: 'manifest.json is empty.' }, { status: 400 });
    }

    if (manifest.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `Too many items: ${manifest.length} (max ${MAX_ITEMS})` },
        { status: 400 }
      );
    }

    // Build image lookup map: basename → Buffer (support images in any subdirectory)
    const imageMap = new Map();
    for (const [key, uint8arr] of Object.entries(files)) {
      if (/\.(jpg|jpeg|png|webp|gif|tiff|avif)$/i.test(key)) {
        const basename = key.split('/').pop();
        const buf = Buffer.from(uint8arr);
        imageMap.set(key, buf);       // full path key
        imageMap.set(basename, buf);  // basename fallback key
      }
    }

    // Create the job record
    const jobId = createJob(manifest.length);

    // Fire-and-forget background processing (does NOT await)
    processImportJob(jobId, manifest, imageMap, publishOverride).catch(err => {
      updateJob(jobId, { status: 'failed', error: err.message });
    });

    return NextResponse.json({ jobId, total: manifest.length }, { status: 202 });
  } catch (error) {
    console.error('[bulk-import] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
