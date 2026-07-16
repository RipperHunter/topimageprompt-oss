import prisma from './prisma';

export function titleToSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
    .substring(0, 100);              // max 100 chars
}

export async function generateUniquePromptSlug(title, excludeId = null) {
  const baseSlug = titleToSlug(title) || 'prompt';
  
  // Find other prompts with similar slugs to avoid conflicts
  const similarPrompts = await prisma.prompt.findMany({
    where: {
      slug: { startsWith: baseSlug },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(similarPrompts.map(p => p.slug).filter(Boolean));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}
