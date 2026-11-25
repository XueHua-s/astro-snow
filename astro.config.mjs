import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';
import pagefind from 'astro-pagefind';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import svgr from 'vite-plugin-svgr';
import { rm, writeFile } from 'node:fs/promises';
import { blogLayoutConfig } from './src/config/blogLayoutConfig.js';
import { defaultContentConfig } from './src/constants/content-config.js';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.js';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.js';
import { rehypeMermaid } from './src/lib/markdown/rehype-mermaid.js';
import { buildSitemap } from './src/lib/seo.js';

const sitemap = {
  name: 'blog-sitemap',
  hooks: {
    'astro:build:done': async ({ dir, pages }) => {
      const sitemapXml = buildSitemap(
        pages.map(({ pathname }) => pathname),
        blogLayoutConfig.site,
      );
      await writeFile(new URL('sitemap.xml', dir), sitemapXml);
    },
  },
};

const sourcePublicDir = {
  name: 'source-public-dir',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      // FIXED: Remove generator reports before Pagefind indexes the public HTML.
      await Promise.all([
        rm(new URL('posts/', dir), { recursive: true, force: true }),
        rm(new URL('fonts/ChillRoundFBold/index.html', dir), { force: true }),
        rm(new URL('fonts/ChillRoundFRegular/index.html', dir), {
          force: true,
        }),
      ]);
      logger.info(
        'Removed source posts and generated font reports from build output.',
      );
    },
  },
};

const mermaidClient = {
  name: 'mermaid-client',
  hooks: {
    'astro:config:setup': ({ injectScript }) => {
      injectScript(
        'page',
        `
        import { initMermaidEnhancer } from '/src/lib/mermaid-enhancer.ts';
        initMermaidEnhancer();
      `,
      );
    },
  },
};

const browserTestFixtures = {
  name: 'browser-test-fixtures',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/blog/test-markdown/[...variant]',
        entrypoint: './tests/fixtures/markdown-page.astro',
      });
    },
  },
};

export default defineConfig({
  srcDir: 'src',
  publicDir: 'source',
  alias: {
    '@': './src',
  },
  site: blogLayoutConfig.site,
  compressHTML: true,
  markdown: {
    gfm: true,
    remarkPlugins: [
      [
        remarkLinkEmbed,
        {
          enableTweetEmbed: defaultContentConfig.enableTweetEmbed,
          enableOGPreview: defaultContentConfig.enableOGPreview,
        },
      ],
    ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['anchor-link'],
          },
        },
      ],
      rehypeImagePlaceholder,
      rehypeMermaid,
    ],
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  integrations: [
    sourcePublicDir,
    sitemap,
    ...(process.env.ASTRO_E2E_FIXTURES === '1' ? [browserTestFixtures] : []),
    react(),
    tailwind({
      config: './tailwind.config.mjs',
    }),
    icon({
      include: {
        gg: ['*'],
        'fa6-regular': ['*'],
        'fa6-solid': ['*'],
        ri: ['*'],
      },
    }),
    pagefind(),
    mermaidClient,
  ],
  vite: {
    plugins: [svgr()],
    ssr: {
      noExternal: ['react-tweet'],
    },
  },
  trailingSlash: 'ignore',
});
