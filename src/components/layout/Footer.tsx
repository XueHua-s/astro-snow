import type { SiteStats } from '@/lib/layout/footer-data';
import { blogLayoutConfig } from '@/config/blogLayoutConfig';
import { MAX_WIDTH } from '@constants/layout';
import { cn } from '@lib/utils';
import SakuraSVG from '../svg/SakuraSvg';

interface Props {
  className?: string;
  stats: SiteStats;
}

export default function Footer({ className, stats }: Props) {
  const currentYear = new Date().getFullYear();
  const startYear = blogLayoutConfig?.startYear ?? currentYear;

  return (
    <footer className={cn('mt-auto pb-6 md:pb-4', className)}>
      <div
        className={cn(
          'mx-auto flex flex-col items-center gap-3 px-6 md:px-3',
          MAX_WIDTH.content,
        )}>
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-6 text-sm md:gap-4">
          <button
            className="flex items-center gap-2 opacity-75 transition-opacity duration-300 hover:opacity-100"
            title="站点总字数">
            <i
              className="fa-regular fa-file-lines text-sm"
              aria-hidden="true"></i>
            <span className="font-medium">{stats.formattedWords}</span>
            <span className="text-xs">字</span>
          </button>

          <div className="bg-muted-foreground/30 h-4 w-px"></div>

          <button
            className="flex items-center gap-2 opacity-75 transition-opacity duration-300 hover:opacity-100"
            title="站点阅读时长">
            <i className="fa-regular fa-clock text-sm" aria-hidden="true"></i>
            <span className="font-medium">{stats.formattedTime}</span>
          </button>

          <div className="bg-muted-foreground/30 h-4 w-px"></div>

          <button
            className="flex items-center gap-2 opacity-75 transition-opacity duration-300 hover:opacity-100"
            title="文章总数">
            <i
              className="fa-regular fa-newspaper text-sm"
              aria-hidden="true"></i>
            <span className="font-medium">{stats.postCount}</span>
            <span className="text-xs">篇</span>
          </button>
        </div>

        <div className="text-muted-foreground flex items-center gap-0.5 text-sm">
          <span className="opacity-75">©</span>
          <span className="font-medium opacity-75">{startYear}</span>
          {startYear !== currentYear && (
            <>
              <span className="opacity-50">-</span>
              <span className="font-medium opacity-75" itemProp="copyrightYear">
                {currentYear}
              </span>
            </>
          )}
          <SakuraSVG className="mx-1 size-5 animate-spin text-[#FFC0CB] duration-10000" />
          <span
            className="author font-medium opacity-75"
            itemProp="copyrightHolder">
            {blogLayoutConfig.name}
            {blogLayoutConfig?.alternate
              ? `@${blogLayoutConfig.alternate}`
              : ''}
          </span>
        </div>

        <div className="text-muted-foreground/80 flex items-center gap-2 text-xs">
          <span className="opacity-75">Powered by theme</span>
          <a
            href="https://github.com/XueHua-s/astro-snow"
            target="_blank"
            rel="noreferrer"
            className="footer-link font-medium transition-all duration-300">
            snow-koharu
          </a>
          <span className="opacity-50">In·</span>
          <span className="opacity-75">From by</span>
          <a
            href="https://github.com/amehime/hexo-theme-shoka"
            target="_blank"
            rel="noreferrer"
            className="footer-link font-medium transition-all duration-300">
            astro-koharu
          </a>
        </div>
      </div>
    </footer>
  );
}
