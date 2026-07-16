const PROMPT_PAGE_SIZE = 500;
const MAX_PROMPT_PAGES = 100;

export async function fetchAllPromptPages({ signal } = {}) {
  const prompts = [];
  let offset = 0;
  let total = 0;

  for (let page = 0; page < MAX_PROMPT_PAGES; page += 1) {
    const response = await fetch(`/api/prompts?view=explore&limit=${PROMPT_PAGE_SIZE}&offset=${offset}`, {
      cache: 'no-store',
      signal,
    });

    if (!response.ok) {
      throw new Error(`Unable to load prompts (${response.status})`);
    }

    const data = await response.json();
    const pagePrompts = Array.isArray(data.prompts) ? data.prompts : [];
    total = Number.isFinite(data.total) ? data.total : offset + pagePrompts.length;
    prompts.push(...pagePrompts);
    offset += pagePrompts.length;

    if (pagePrompts.length === 0 || offset >= total || pagePrompts.length < PROMPT_PAGE_SIZE) {
      break;
    }
  }

  return { prompts, total };
}
