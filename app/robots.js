import { BRAND_URL } from '../lib/brand';

const PRIVATE_PATHS = ['/admin', '/api', '/profile'];
const SEARCH_CRAWLERS = [
  'Googlebot',
  'Googlebot-Image',
  'Bingbot',
];
const AI_CRAWLERS = [
  'Google-Extended',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
];

export default function robots() {
  return {
    rules: [
      { userAgent: SEARCH_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${BRAND_URL}/sitemap.xml`,
    host: BRAND_URL,
  };
}
