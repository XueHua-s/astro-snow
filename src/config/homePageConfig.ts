// Home / BlogIndex Config
export const homePageProfile = {
  name: 'Snow',
  tagline: '“爬起仅仅只是因为不想输。”',
  avatarUrl: '/img/724d7fb480c8ac0db472ca5c7e36d239.jpg',
  avatarAlt: 'SnowAvatar',
  backgroundUrl: '/img/site_header_1920.webp',
  footerText: '© Snowの小窝 - 2022-2025',
};

export const homePageLinks = {
  xUrl: 'https://x.com/xiaoxueljx?s=21',
  githubUrl: 'https://github.com/XueHua-s',
  telegramUrl: 'https://t.me/litleSnow',
  bilibiliUrl: 'https://space.bilibili.com/158525031',
};

export const homePageMusic = {
  /** 网易云音乐外链播放器 URL */
  src: '//music.163.com/outchain/player?type=2&id=28283665&auto=1&height=66',
  /** iframe 尺寸 */
  size: 86,
};

export async function getHomePageProfile() {
  const { getBackgroundImages } = await import('@lib/backgrounds');
  const backgroundImages = await getBackgroundImages();
  const backgroundUrl = backgroundImages.length
    ? backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
    : homePageProfile.backgroundUrl;

  return { ...homePageProfile, backgroundUrl };
}
