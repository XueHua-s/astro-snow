export type Router = {
  name?: string;
  path?: string;
  icon?: string;
  children?: Router[];
};

export const BLOG_BASE = '/blog';

export const withBlogBase = (path: string) => {
  if (!path || path === '/') return BLOG_BASE;
  return `${BLOG_BASE}${path.startsWith('/') ? path : `/${path}`}`;
};

export const normalizeRoutePath = (path?: string | null) => {
  if (typeof path !== 'string') return '';

  const trimmedPath = path.trim();
  if (!trimmedPath) return '';

  let pathname = trimmedPath;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmedPath)) {
    try {
      pathname = new URL(trimmedPath).pathname;
    } catch {
      pathname = trimmedPath;
    }
  }

  const pathWithoutSearch = pathname.split(/[?#]/)[0] ?? '';
  const withLeadingSlash = pathWithoutSearch.startsWith('/')
    ? pathWithoutSearch
    : `/${pathWithoutSearch}`;
  const withoutDuplicateSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');
  const withoutTrailingSlash = withoutDuplicateSlashes.replace(/\/+$/, '');

  return withoutTrailingSlash || '/';
};

export const isRoutePathActive = (
  routePath?: string | null,
  currentPath?: string | null,
) => {
  const route = normalizeRoutePath(routePath);
  const current = normalizeRoutePath(currentPath);

  if (!route || !current) return false;

  if (route === BLOG_BASE) {
    const postsRoute = `${BLOG_BASE}/posts`;
    return (
      current === BLOG_BASE ||
      current === postsRoute ||
      current.startsWith(`${postsRoute}/`)
    );
  }

  return current === route || current.startsWith(`${route}/`);
};

export enum Routes {
  Home = BLOG_BASE,
  About = `${BLOG_BASE}/about`,
  Categories = `${BLOG_BASE}/categories`,
  Tags = `${BLOG_BASE}/tags`,
  Friends = `${BLOG_BASE}/friends`,
  Weekly = `${BLOG_BASE}/weekly`,
  // Gallery = `${BLOG_BASE}/gallery`,
  Post = `${BLOG_BASE}/post`,
  Posts = `${BLOG_BASE}/posts`,
  Archives = `${BLOG_BASE}/archives`,
  // Dashboard = `${BLOG_BASE}/dashboard`,
}

export const routers: Router[] = [
  { name: '首页', path: Routes.Home, icon: 'fa-solid fa-house-chimney' },
  {
    name: '文章',
    icon: 'fa-solid fa-pen-nib',
    children: [
      {
        name: '分类',
        path: Routes.Categories,
        icon: 'fa-solid fa-layer-group',
      },
      { name: '标签', path: Routes.Tags, icon: 'fa-solid fa-tags' },
      { name: '周刊', path: Routes.Weekly, icon: 'fa-regular fa-newspaper' },
    ],
  },
  { name: '友链', path: Routes.Friends, icon: 'fa-solid fa-link' },
  { name: '关于', path: Routes.About, icon: 'fa-regular fa-circle-user' },
];
