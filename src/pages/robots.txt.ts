import type { APIRoute } from 'astro';
import { blogLayoutConfig } from '@/config/blogLayoutConfig';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap.xml', site ?? blogLayoutConfig.site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
