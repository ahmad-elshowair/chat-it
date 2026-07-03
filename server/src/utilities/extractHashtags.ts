const HASHTAG_REGEX = /(?<![/\w#])#([a-zA-Z0-9_]{2,50})\b/g;

const MAX_TAGS = 10;
const MIN_LENGTH = 2;
const MAX_LENGTH = 50;

/**
 * Extract unique hashtags from post description text.
 * Normalizes to lowercase, validates length, rejects oversized tags,
 * deduplicates case-insensitively, and slices to first 10 in document order.
 * Skips URL fragments (e.g., https://example.com/#section) and ##double patterns.
 */
export const extractHashtags = (description: string): string[] => {
  if (!description) return [];

  const matches = description.matchAll(HASHTAG_REGEX);
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const match of matches) {
    if (tags.length >= MAX_TAGS) break;

    const raw = match[1];
    const normalized = raw.toLowerCase();

    if (normalized.length < MIN_LENGTH || normalized.length > MAX_LENGTH) continue;

    if (seen.has(normalized)) continue;

    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
};
