import type { ImageMetadata } from 'astro';

// FIXED: Discover the artwork from source paths before Astro bundles the route.
// Reading a path relative to the output chunks depends on the build directory.
const localImages = import.meta.glob<{ default: ImageMetadata }>([
  '/source/img/{backgrounds,cover}/*.webp',
  '/source/img/site_header_1920.webp',
  '/source/img/724d7fb480c8ac0db472ca5c7e36d239.jpg',
]);

export const backgroundImages = Object.keys(localImages)
  .filter((path) => path.startsWith('/source/img/backgrounds/'))
  .map((path) => path.slice('/source'.length));

export function getLocalImageLoader(
  src: string,
): (() => Promise<{ default: ImageMetadata }>) | undefined {
  return localImages[`/source${src}`];
}
