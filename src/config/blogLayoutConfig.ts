type BlogLayoutConfig = {
  title: string;
  alternate?: string;
  subtitle?: string;
  name: string;
  description?: string;
  avatar?: string;
  showLogo?: boolean;
  author?: string;
  site: string;
  startYear?: number;
  keywords?: string[];
  banner: {
    src: string;
    srcset: string;
    lqipSrc: string;
    alt?: string;
  };
};

type SocialPlatform = {
  url: string;
  label: string;
  iconText: string;
  iconClass?: string; // Font Awesome icon class
  color: string;
};

type SocialConfig = {
  github?: SocialPlatform;
  x?: SocialPlatform;
  email?: SocialPlatform;
  telegram?: SocialPlatform;
  bilibili?: SocialPlatform;
};

export const blogLayoutConfig: BlogLayoutConfig = {
  title: '雪花の博客',
  alternate: 'snow',
  subtitle: '爬起仅仅只是因为不想输。',
  name: 'snow',
  description:
    'LittleSnow 的个人博客，分享 React、TypeScript 等前端开发笔记、技术教程，以及周刊和生活随笔。',
  avatar: '/img/724d7fb480c8ac0db472ca5c7e36d239.jpg',
  showLogo: true,
  author: 'snow',
  site: 'https://xhblog.top/',
  startYear: 2022,
  keywords: ['snow', 'littleSnow', '博客', '个人空间', '技术', '前端'],
  banner: {
    src: '/img/site_header_1920.webp',
    srcset: '/img/site_header_800.webp 800w,/img/site_header_1920.webp 1200w',
    lqipSrc: '/img/site_header_1920.webp',
    alt: 'cover',
  },
};

export const blogSocialConfig: SocialConfig = {
  github: {
    url: 'https://github.com/XueHua-s',
    label: 'GitHub',
    iconText: 'GH',
    iconClass: 'fa-brands fa-github',
    color: '#191717',
  },
  x: {
    url: 'https://x.com/xiaoxueljx?s=21',
    label: 'X (推特)',
    iconText: 'X',
    iconClass: 'fa-brands fa-x-twitter',
    color: '#4b9ae4',
  },
  email: {
    url: 'mailto:xuehualjx@gmail.com',
    label: 'Email',
    iconText: '@',
    iconClass: 'fa-regular fa-envelope',
    color: '#55acd5',
  },
  telegram: {
    url: 'https://t.me/litleSnow',
    label: 'Telegram',
    iconText: 'TG',
    iconClass: 'fa-brands fa-telegram',
    color: '#229ed9',
  },
  bilibili: {
    url: 'https://space.bilibili.com/158525031',
    label: '哔哩哔哩',
    iconText: 'B',
    iconClass: 'fa-brands fa-bilibili',
    color: '#00a1d6',
  },
};

const { title, alternate, subtitle } = blogLayoutConfig;

export const blogSeoConfig = {
  title: `${alternate ? alternate + ' = ' : ''}${title}${subtitle ? ' = ' + subtitle : ''}`,
  description: blogLayoutConfig.description,
  keywords: blogLayoutConfig?.keywords?.join(',') ?? '',
  url: blogLayoutConfig.site,
};

export const defaultCoverList = Array.from(
  { length: 13 },
  (_, index) => index + 1,
).map((item) => `/img/cover/${item}.webp`);
