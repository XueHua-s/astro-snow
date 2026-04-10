import { useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { HomeSiderSegmentType, HomeSiderType } from '@constants/enum';
import { homeSiderSegmentType } from '@store/app';
import { TableOfContents } from './TableOfContents';
import HomeSiderSegmented from '@components/ui/segmented/HomeSiderSegmented';
import { SeriesPostList } from '@components/post/SeriesPostList';
import { SeriesNavigation } from '@components/post/SeriesNavigation';
import { ScrollProgress } from './ScrollProgress';
import HomeInfoPanel from './HomeInfoPanel';
import { cn } from '@lib/utils';
import type { Router } from '@constants/router';
import type { BlogPost } from '@/types/blog';
import type { MarkdownHeading } from '@/types/markdown';

interface SeriesPostItem {
  post: BlogPost;
  href: string;
}

interface HomeInfoData {
  avatar: string;
  name?: string;
  description?: string;
  postCount: number;
  categoryCount: number;
  tagCount: number;
  routes: Router[];
  currentPath: string;
}

interface HomeSiderPanelProps {
  type: HomeSiderType;
  defaultSegmentType: HomeSiderSegmentType;
  homeInfo: HomeInfoData;
  tocHeadings?: MarkdownHeading[];
  tocNumbering?: boolean;
  seriesPostItems?: SeriesPostItem[];
  currentPostSlug?: string;
  prevPostItem?: SeriesPostItem | null;
  nextPostItem?: SeriesPostItem | null;
}

export function HomeSiderPanel({
  type,
  defaultSegmentType,
  homeInfo,
  tocHeadings,
  tocNumbering = true,
  seriesPostItems = [],
  currentPostSlug,
  prevPostItem,
  nextPostItem,
}: HomeSiderPanelProps) {
  const isPostPage = type === HomeSiderType.POST;
  const storeSegment = useStore(homeSiderSegmentType);
  const effectiveSegment = isPostPage
    ? storeSegment
    : HomeSiderSegmentType.INFO;

  useEffect(() => {
    const target = isPostPage ? defaultSegmentType : HomeSiderSegmentType.INFO;
    if (homeSiderSegmentType.get() !== target) {
      homeSiderSegmentType.set(target);
    }
  }, [defaultSegmentType, isPostPage]);

  const slotClassName = (slotType: HomeSiderSegmentType) =>
    cn('sider-slot', {
      hidden: slotType !== effectiveSegment,
    });

  const defaultSegmentValue = useMemo(
    () => (isPostPage ? defaultSegmentType : HomeSiderSegmentType.INFO),
    [defaultSegmentType, isPostPage],
  );

  return (
    <>
      {isPostPage && (
        <HomeSiderSegmented
          className="my-4 flex w-full justify-between text-sm/6"
          itemClass="grow"
          defaultValue={defaultSegmentValue}
          id="inner-home-sider"
        />
      )}

      <div
        className="vertical-scrollbar pt-10 scroll-gutter-stable relative block w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto md:pt-4 md:pl-3"
        data-type={type}
        data-default-type={defaultSegmentValue}>
        <div
          className={slotClassName(HomeSiderSegmentType.INFO)}
          data-slot-type="info">
          <HomeInfoPanel
            className={type === HomeSiderType.HOME ? 'pt-18 md:pt-0' : ''}
            {...homeInfo}
          />
        </div>
        <div
          className={slotClassName(HomeSiderSegmentType.DIRECTORY)}
          data-slot-type="directory">
          {isPostPage && (
            <TableOfContents
              enableNumbering={tocNumbering}
              sourceHeadings={tocHeadings}
            />
          )}
        </div>
        <div
          className={slotClassName(HomeSiderSegmentType.SERIES)}
          data-slot-type="series">
          {isPostPage && (
            <SeriesPostList
              posts={seriesPostItems}
              currentPostSlug={currentPostSlug}
            />
          )}
        </div>
      </div>

      {isPostPage && (
        <SeriesNavigation
          prevPost={prevPostItem ?? null}
          nextPost={nextPostItem ?? null}
          className="w-full px-2"
        />
      )}

      <ScrollProgress className="mt-auto w-full rounded-full pt-4 sticky bottom-0" />
    </>
  );
}

export default HomeSiderPanel;
