import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '../../../../../lib/prisma';
import { ADMIN_CACHE_HEADER, rateLimit, readJsonObject, requireAdmin } from '../../../../../lib/api-security';
import { MAX_BLOG_IMPORT_ITEMS, normalizeBlogImportRecord } from '../../../../../lib/blog-import';
import { processAndStoreImage, validateImage } from '../../../../../lib/image-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MULTIPART_BYTES = 100 * 1024 * 1024;
const MAX_COVER_IMAGES = MAX_BLOG_IMPORT_ITEMS;

function normalizeCoverFileName(value) {
  if (typeof value !== 'string') return '';
  const filename = value.trim().split(/[\\/]/).pop();
  if (!filename || filename.length > 240) return '';
  if (!/\.(jpe?g|png|webp|gif|tiff|avif)$/i.test(filename)) return '';
  return filename.toLowerCase();
}

async function readImportRequest(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    const { body, error } = await readJsonObject(request);
    return { body, files: [], error };
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return {
      error: NextResponse.json({ error: 'Blog package must be 100MB or smaller.' }, { status: 413 }),
    };
  }

  const formData = await request.formData();
  const payload = formData.get('payload');
  if (typeof payload !== 'string' || !payload.trim()) {
    return {
      error: NextResponse.json({ error: 'The blog package is missing its JSON payload.' }, { status: 400 }),
    };
  }

  let body = null;
  try {
    body = JSON.parse(payload);
  } catch {
    return {
      error: NextResponse.json({ error: 'The blog package contains invalid JSON.' }, { status: 400 }),
    };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: NextResponse.json({ error: 'The blog package JSON must be an object.' }, { status: 400 }),
    };
  }

  const files = formData.getAll('coverImages')
    .filter((file) => file && typeof file.arrayBuffer === 'function' && file.size > 0);
  if (files.length > MAX_COVER_IMAGES) {
    return {
      error: NextResponse.json({ error: `A package can contain at most ${MAX_COVER_IMAGES} cover images.` }, { status: 400 }),
    };
  }

  return { body, files, error: null };
}

function getSafeExistingPostUpdate(record) {
  const updateData = { ...record };
  delete updateData.slug;
  delete updateData.published;
  delete updateData.visibility;
  delete updateData.featuredOnHome;
  delete updateData.isHeroPost;
  return updateData;
}

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const limited = rateLimit(request, { namespace: 'admin-blog-json-import', limit: 10, windowMs: 10 * 60 * 1000 });
    if (limited) return limited;

    const { body, files, error: bodyError } = await readImportRequest(request);
    if (bodyError) return bodyError;

    if (!Array.isArray(body.posts) || body.posts.length === 0) {
      return NextResponse.json({ error: 'posts must be a non-empty JSON array.' }, { status: 400 });
    }
    if (body.posts.length > MAX_BLOG_IMPORT_ITEMS) {
      return NextResponse.json({ error: `A single import can contain at most ${MAX_BLOG_IMPORT_ITEMS} posts.` }, { status: 400 });
    }

    const forceDraft = body.forceDraft === true;
    const updateExisting = body.updateExisting === true;
    const fileLookup = new Map();
    const packageErrors = [];

    for (const file of files) {
      const normalizedName = normalizeCoverFileName(file.name);
      if (!normalizedName) {
        packageErrors.push({ title: file.name || 'Cover image', error: 'Unsupported cover image filename or extension.' });
        continue;
      }
      if (fileLookup.has(normalizedName)) {
        packageErrors.push({ title: file.name, error: 'Two selected cover images have the same filename.' });
        continue;
      }
      fileLookup.set(normalizedName, file);
    }

    const coverFileNames = body.posts.map((record, index) => {
      if (record?.heroImageFile === undefined || record?.heroImageFile === null || record?.heroImageFile === '') return '';
      const normalizedName = normalizeCoverFileName(record.heroImageFile);
      if (!normalizedName) {
        packageErrors.push({ index, title: record?.title || `Item ${index + 1}`, error: 'heroImageFile must name a supported JPG, PNG, WebP, GIF, TIFF, or AVIF file.' });
        return '';
      }
      if (!fileLookup.has(normalizedName)) {
        packageErrors.push({ index, title: record?.title || `Item ${index + 1}`, error: `Cover image not found in package: ${record.heroImageFile}` });
      }
      return normalizedName;
    });

    const normalized = body.posts.map((record, index) => {
      const result = normalizeBlogImportRecord(record, { forceDraft });
      return { ...result, index, title: record?.title || `Item ${index + 1}` };
    });
    const validationErrors = packageErrors.concat(normalized
      .filter((item) => item.error)
      .map((item) => ({ index: item.index, title: item.title, error: item.error })));

    const slugOwners = new Map();
    for (const item of normalized.filter((entry) => entry.data)) {
      const previousIndex = slugOwners.get(item.data.slug);
      if (previousIndex !== undefined) {
        validationErrors.push({
          index: item.index,
          title: item.title,
          error: `Duplicate slug in this file (also used by item ${previousIndex + 1}).`,
        });
      } else {
        slugOwners.set(item.data.slug, item.index);
      }
    }

    const heroPosts = normalized.filter((item) => item.data?.isHeroPost);
    if (heroPosts.length > 1) {
      validationErrors.push({ index: heroPosts[1].index, title: heroPosts[1].title, error: 'Only one imported post can be the hero post.' });
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Import validation failed.', validationErrors }, { status: 400 });
    }

    const records = normalized.map((item) => item.data);
    const existing = await prisma.blog.findMany({
      where: { slug: { in: records.map((record) => record.slug) } },
      select: { slug: true, title: true },
    });
    if (existing.length > 0 && !updateExisting) {
      return NextResponse.json({
        error: 'One or more slugs already exist. Enable “Update matching slugs” or edit those slugs and import again.',
        duplicates: existing,
      }, { status: 409 });
    }

    const referencedFiles = [...new Set(coverFileNames.filter(Boolean))];
    const imageBuffers = new Map();
    const imageValidationErrors = [];
    for (const filename of referencedFiles) {
      const file = fileLookup.get(filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = await validateImage(buffer, file.name);
      if (!validation.valid) {
        imageValidationErrors.push({ title: file.name, error: validation.error });
      } else {
        imageBuffers.set(filename, buffer);
      }
    }
    if (imageValidationErrors.length > 0) {
      return NextResponse.json({ error: 'Cover image validation failed.', validationErrors: imageValidationErrors }, { status: 400 });
    }

    const uploadedImages = new Map();
    for (const filename of referencedFiles) {
      const file = fileLookup.get(filename);
      const uploaded = await processAndStoreImage(imageBuffers.get(filename), file.name);
      uploadedImages.set(filename, uploaded.imageUrl);
    }

    coverFileNames.forEach((filename, index) => {
      if (filename) records[index].heroImage = uploadedImages.get(filename);
    });

    const existingSlugs = new Set(existing.map((post) => post.slug));
    const outcome = await prisma.$transaction(async (transaction) => {
      const posts = [];
      let createdCount = 0;
      let updatedCount = 0;
      for (const record of records) {
        if (updateExisting && existingSlugs.has(record.slug)) {
          const post = await transaction.blog.update({
            where: { slug: record.slug },
            data: getSafeExistingPostUpdate(record),
          });
          posts.push({ ...post, operation: 'updated' });
          updatedCount += 1;
        } else {
          const post = await transaction.blog.create({ data: record });
          posts.push({ ...post, operation: 'created' });
          createdCount += 1;
        }
      }

      const heroPost = posts.find((post) => post.operation === 'created' && post.isHeroPost);
      if (heroPost) {
        await transaction.blog.updateMany({
          where: { id: { not: heroPost.id } },
          data: { isHeroPost: false },
        });
      }
      return { posts, createdCount, updatedCount };
    });

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    revalidatePath('/sitemap.xml');
    outcome.posts.forEach((post) => revalidatePath(`/blog/${post.slug}`));

    return NextResponse.json({
      imported: outcome.posts.length,
      created: outcome.createdCount,
      updated: outcome.updatedCount,
      imagesUploaded: uploadedImages.size,
      forceDraft,
      updateExisting,
      posts: outcome.posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        published: post.published,
        heroImage: post.heroImage,
        operation: post.operation,
      })),
    }, {
      status: 201,
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A blog with one of these slugs already exists.' }, { status: 409 });
    }
    console.error('Blog JSON import error:', error);
    return NextResponse.json({ error: 'Blog import failed. No posts were added.' }, { status: 500 });
  }
}
