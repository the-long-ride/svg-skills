import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface HttpClientOptions {
  cacheDir?: string;
  cacheTtlMs?: number;
  minIntervalMs?: number;
  fetchImpl?: any;
}

export function assertPublicSvgRepoUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('SVG Repo requests must use HTTPS.');
  if (url.hostname !== 'www.svgrepo.com' && url.hostname !== 'svgrepo.com') throw new Error('Only public SVG Repo URLs are allowed.');
  if (/^\/api(?:\/|$)/i.test(url.pathname)) throw new Error('SVG Repo private API endpoints are not allowed.');
  return url;
}

export function cacheFileName(url: string): string {
  return `${createHash('sha256').update(url).digest('hex')}.cache`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PublicHttpClient {
  private readonly cacheDir: string;
  private readonly cacheTtlMs: number;
  private readonly minIntervalMs: number;
  private readonly fetchImpl: any;
  private lastRequestAt = 0;

  constructor(options: HttpClientOptions = {}) {
    this.cacheDir = options.cacheDir ?? process.env.SVG_ICON_CACHE_DIR ?? join(homedir(), '.svg-icon-agent', 'cache');
    this.cacheTtlMs = options.cacheTtlMs ?? 24 * 60 * 60 * 1000;
    this.minIntervalMs = options.minIntervalMs ?? 1000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getText(input: string, useCache = true): Promise<string> {
    const url = assertPublicSvgRepoUrl(input).toString();
    await mkdir(this.cacheDir, { recursive: true });
    const path = join(this.cacheDir, cacheFileName(url));

    if (useCache) {
      try {
        const info = await stat(path);
        if (Date.now() - info.mtimeMs <= this.cacheTtlMs) return await readFile(path, 'utf8');
      } catch { /* cache miss */ }
    }

    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) await sleep(this.minIntervalMs - elapsed);
    this.lastRequestAt = Date.now();

    const response = await this.fetchImpl(url, {
      headers: { 'user-agent': 'svg-icon-agent/0.1 (+https://www.svgrepo.com/)' },
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`SVG Repo request failed (${response.status}) for ${url}`);
    const body = await response.text();
    if (useCache) await writeFile(path, body, 'utf8');
    return body;
  }
}
