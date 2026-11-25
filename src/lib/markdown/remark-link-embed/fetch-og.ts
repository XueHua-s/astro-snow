import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import type { OGData } from './types';

const iconLinks = [
  'link[rel~="icon" i][href]',
  'link[rel~="apple-touch-icon" i][href]',
  'link[rel~="apple-touch-icon-precomposed" i][href]',
  'link[rel~="mask-icon" i][href]',
].join(', ');

// FIXED: Extract declared icons from the page without probing image URLs.
const localFavicon: metascraper.Rules = {
  favicon: ({ htmlDom, url }) => {
    for (const link of htmlDom(iconLinks).toArray()) {
      const href = htmlDom(link).attr('href')?.trim();
      if (!href || !URL.canParse(href, url)) continue;
      const icon = new URL(href, url);
      if (icon.protocol === 'http:' || icon.protocol === 'https:')
        return icon.href;
    }
  },
};

const scraper = metascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperTitle(),
  metascraperUrl(),
  localFavicon,
]);
const TIMEOUT_MS = 5000;

export async function fetchOGData(url: string): Promise<OGData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      controller.abort();
      console.warn(`[Link Embed] Failed to fetch ${url}: ${response.status}`);
      return {
        originUrl: url,
        url,
        error: `Failed to fetch: ${response.status}`,
      };
    }

    // FIXED: Keep the abort signal active while the response body is downloading.
    const html = await response.text();
    clearTimeout(timeoutId);
    const metadata = await scraper({ html, url: response.url || url });

    return {
      originUrl: url,
      url: metadata.url || url,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      logo: metadata?.logo || metadata?.favicon,
      author: metadata?.author || metadata?.publisher,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Link Embed] Timeout fetching ${url}`);
      return {
        originUrl: url,
        url,
        error: 'Request timeout',
      };
    }
    console.warn(`[Link Embed] Error fetching ${url}:`, error);
    return {
      originUrl: url,
      url,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
