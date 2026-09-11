export const SVG_REPO_ORIGIN = 'https://www.svgrepo.com';

export type SearchStyle = 'all' | 'monocolor' | 'multicolor' | 'duotone' | 'outlined' | 'filled' | 'icon' | 'glyph' | 'rounded' | 'sharp';

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  url: string;
}

export interface IconMetadata extends SearchResult {
  license: string;
  collection: string;
  uploader: string;
  downloadUrl: string;
}

function decodeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' '
  };
  return value.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, m => entities[m] ?? m).replace(/\s+/g, ' ').trim();
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' '));
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function attr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ? decodeHtml(match[2]) : undefined;
}

export function buildSearchUrl(query: string, style: SearchStyle | string = 'all'): string {
  const q = slugify(query);
  if (!q) throw new Error('Search query must contain letters or numbers.');
  const normalized = style.toLowerCase();
  const allowed = new Set(['all', 'monocolor', 'multicolor', 'duotone', 'outlined', 'filled', 'icon', 'glyph', 'rounded', 'sharp']);
  if (!allowed.has(normalized)) throw new Error(`Unsupported style: ${style}`);
  return `${SVG_REPO_ORIGIN}/vectors/${q}/${normalized === 'all' ? '' : `${normalized}/`}`;
}

export function normalizeIconRef(ref: string): string {
  const input = ref.trim();
  if (/^\d+$/.test(input)) return `${SVG_REPO_ORIGIN}/svg/${input}`;
  if (/^\d+\/[a-z0-9-]+$/i.test(input)) return `${SVG_REPO_ORIGIN}/svg/${input}`;

  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Expected an SVG Repo icon URL, numeric id, or id/slug.'); }
  if (url.hostname !== 'www.svgrepo.com' && url.hostname !== 'svgrepo.com') throw new Error('Only SVG Repo icon references are supported.');
  const match = url.pathname.match(/^\/svg\/(\d+)(?:\/([a-z0-9-]+))?\/?$/i);
  if (!match) throw new Error('Expected an SVG Repo icon page URL under /svg/<id>/<slug>.');
  return `${SVG_REPO_ORIGIN}/svg/${match[1]}${match[2] ? `/${match[2]}` : ''}`;
}

export function downloadUrlFor(iconUrl: string): string {
  const normalized = normalizeIconRef(iconUrl);
  const match = normalized.match(/\/svg\/(\d+)\/([a-z0-9-]+)$/i);
  if (!match) throw new Error('A canonical SVG Repo icon URL with id and slug is required to derive the download URL.');
  return `${SVG_REPO_ORIGIN}/download/${match[1]}/${match[2]}.svg`;
}

export function parseSearchPage(html: string, limit = 10): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const anchorRe = /<a\b[^>]*href\s*=\s*(["'])\/svg\/(\d+)\/([a-z0-9-]+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) && results.length < limit) {
    const [, , id, slug, body] = match;
    const key = `${id}/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const openTag = match[0].slice(0, match[0].indexOf('>') + 1);
    const title = attr(openTag, 'title') ?? attr(body.match(/<img\b[^>]*>/i)?.[0] ?? '', 'alt') ?? stripTags(body) ?? slug.replace(/-/g, ' ');
    results.push({ id, slug, title, url: `${SVG_REPO_ORIGIN}/svg/${id}/${slug}` });
  }
  return results;
}

function readLabel(html: string, label: string): string {
  const re = new RegExp(`${label}\\s*:\\s*(?:<[^>]+>)*\\s*(?:<a\\b[^>]*>)?([\\s\\S]*?)(?:<\\/a>)?\\s*<\\/li>`, 'i');
  const match = html.match(re);
  if (match?.[1]) return stripTags(match[1]);

  const text = stripTags(html);
  const textMatch = text.match(new RegExp(`${label}\\s*:\\s*([^|\\n]+?)(?=\\s+(?:COLLECTION|LICENSE|UPLOADER)\\s*:|$)`, 'i'));
  return textMatch?.[1]?.trim() ?? '';
}

export function parseIconPage(html: string, sourceUrl: string): IconMetadata {
  const normalized = normalizeIconRef(sourceUrl);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? stripTags(h1[1]) : '';
  const downloadMatch = html.match(/href\s*=\s*(["'])(\/download\/(\d+)\/([a-z0-9-]+)\.svg)\1/i);
  const sourceMatch = normalized.match(/\/svg\/(\d+)(?:\/([a-z0-9-]+))?$/i);
  const id = downloadMatch?.[3] ?? sourceMatch?.[1];
  const slug = downloadMatch?.[4] ?? sourceMatch?.[2];
  if (!id || !slug) throw new Error('Could not determine SVG Repo icon id/slug from the icon page.');

  return {
    id,
    slug,
    title: title || slug.replace(/-/g, ' '),
    url: `${SVG_REPO_ORIGIN}/svg/${id}/${slug}`,
    license: readLabel(html, 'LICENSE') || 'Unknown',
    collection: readLabel(html, 'COLLECTION') || 'Unknown',
    uploader: readLabel(html, 'UPLOADER') || 'Unknown',
    downloadUrl: downloadMatch ? `${SVG_REPO_ORIGIN}${downloadMatch[2]}` : `${SVG_REPO_ORIGIN}/download/${id}/${slug}.svg`
  };
}
