import 'server-only';

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

function normalizeEditorMarkup(value) {
  return String(value || '')
    // contentEditable stores indentation as HTML entities. Inside fenced code,
    // marked escapes those entities again, which makes "&nbsp;" visible.
    .replace(/&(?:amp;)*nbsp;|&#0*160;|&#x0*a0;/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<(div|p)[^>]*>/gi, '')
    .replace(/\|\s*\n+\s*\|/g, '|\n|')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderSafeMarkdown(value) {
  const rendered = marked.parse(normalizeEditorMarkup(value), {
    async: false,
    gfm: true,
    breaks: false,
  });

  return sanitizeHtml(rendered, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'figure', 'figcaption', 'details', 'summary', 'mark', 'kbd', 'samp',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      code: ['class'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }, true),
    },
  });
}

function headingSlug(value, fallback, usedIds) {
  const base = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 72) || fallback;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function decodeHeadingText(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

export function renderSafeMarkdownArticle(value) {
  const usedIds = new Set();
  const toc = [];
  let headingIndex = 0;
  let html = renderSafeMarkdown(value);

  html = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attributes, innerHtml) => {
    const text = decodeHeadingText(sanitizeHtml(innerHtml, { allowedTags: [], allowedAttributes: {} }))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return full;
    const existingId = attributes.match(/\sid=["']([a-zA-Z][\w-]{0,100})["']/i)?.[1];
    const id = headingSlug(existingId || text, `section-${headingIndex + 1}`, usedIds);
    const cleanAttributes = attributes.replace(/\s+id=["'][^"']*["']/gi, '');
    headingIndex += 1;
    toc.push({ id, text, level: Number(tag.slice(1)) });
    return `<${tag}${cleanAttributes} id="${id}" class="blog-scroll-target">${innerHtml}</${tag}>`;
  });

  html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi, (full, attributes, code) => {
    const language = attributes.match(/class="[^"]*language-([\w-]+)/i)?.[1] || 'code';
    return `<div class="blog-code-shell"><div class="blog-code-toolbar"><span>${language.toUpperCase()}</span><button type="button" class="blog-code-copy" data-copy-code>Copy code</button></div><pre><code${attributes}>${code}</code></pre></div>`;
  });

  return { html, toc };
}
