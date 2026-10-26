import '@fortawesome/fontawesome-free/css/all.min.css';
import { cn } from '@/lib/utils';
import {
  homePageLinks,
  homePageMusic,
  homePageProfile,
} from '../../config/homePageConfig';

interface SocialButton {
  href: string;
  icon: string;
  label: string;
  external?: boolean;
}

function getSocialButtons(links: typeof homePageLinks): SocialButton[] {
  return [
    {
      href: links.bilibiliUrl,
      icon: 'fa-brands fa-bilibili',
      label: '哔哩哔哩',
      external: true,
    },
    {
      href: links.telegramUrl,
      icon: 'fa-brands fa-telegram',
      label: 'Telegram',
      external: true,
    },
    {
      href: links.xUrl,
      icon: 'fa-brands fa-x-twitter',
      label: 'X',
      external: true,
    },
    {
      href: links.githubUrl,
      icon: 'fa-brands fa-github',
      label: 'GitHub',
      external: true,
    },
    {
      href: '/blog',
      icon: 'fa-solid fa-pen-nib',
      label: '进入博客',
    },
  ];
}

interface HomePageProps {
  profile?: typeof homePageProfile;
  links?: typeof homePageLinks;
}

const HomePage = ({
  profile = homePageProfile,
  links = homePageLinks,
}: HomePageProps) => {
  return (
    <section className="relative h-screen overflow-hidden bg-gradient-to-br">
      <div className="absolute inset-0">
        <div
          className="fixed inset-0 h-screen w-screen bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url('${profile.backgroundUrl}')` }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35"
        />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[860px] flex-col px-5">
        <div className="flex flex-1 items-center justify-center">
          <div
            className="glass glass-hero glass-refract relative w-full p-6"
            data-glass-hero>
            <div
              className="glass-specular pointer-events-none -z-10"
              aria-hidden="true"
            />
            <div className="flex justify-center">
              <div className="relative mb-6 h-[150px] w-[150px] rounded-full border-2 border-[var(--glass-border)]">
                <img
                  src={profile.avatarUrl}
                  alt={profile.avatarAlt}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-[2.5rem] font-bold tracking-[1px]">
                {profile.name}
              </h1>
              <p className="mx-auto mt-3 max-w-[560px] px-5 text-[1.1rem] italic text-[#666] dark:text-gray-300">
                {profile.tagline}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {getSocialButtons(links).map(
                ({ href, icon, label, external }) => (
                  <a
                    key={label}
                    className={cn(
                      'flex min-w-[200px] items-center justify-center gap-2 rounded-[25px] px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--glass-primary-hsl))]',
                      external
                        ? 'material-action'
                        : 'bg-[hsl(var(--glass-primary-hsl))] text-[hsl(var(--glass-primary-ink))] hover:brightness-110',
                    )}
                    href={href}
                    {...(external
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}>
                    <i className={`${icon} text-base`} aria-hidden="true" />
                    {label}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-20 flex flex-col items-start gap-2">
          <div className="glass glass-flat h-[86px] w-[86px] overflow-hidden">
            <iframe
              title="网易云音乐播放器"
              width={homePageMusic.size}
              height={homePageMusic.size}
              src={homePageMusic.src}
              sandbox="allow-scripts allow-same-origin"
              style={{ border: 0 }}
            />
          </div>
        </div>

        <footer className="pb-6 text-center text-sm text-pink-main">
          {profile.footerText}
        </footer>
      </div>
    </section>
  );
};

export default HomePage;
