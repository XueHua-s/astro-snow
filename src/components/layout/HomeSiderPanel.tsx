import { Fragment, useMemo, useState } from 'react';
import { HomeSiderSegmentType, HomeSiderType } from '@constants/enum';
import { TableOfContents } from './TableOfContents';
import HomeSiderSegmented from '@components/ui/segmented/HomeSiderSegmented';
import { SeriesPostList } from '@components/post/SeriesPostList';
import { SeriesNavigation } from '@components/post/SeriesNavigation';
import { ScrollProgress } from './ScrollProgress';
import HomeInfoPanel, { type HomeInfoPanelProps } from './HomeInfoPanel';
import type { PostLinkItem } from '@lib/content/posts/types';
import type { MarkdownHeading } from '@/types/markdown';

interface HomeSiderPanelProps {
  type: HomeSiderType;
  defaultSegmentType: HomeSiderSegmentType;
  homeInfo: HomeInfoPanelProps;
  tocHeadings?: MarkdownHeading[];
  tocNumbering?: boolean;
  seriesPostItems?: PostLinkItem[];
  currentPostSlug?: string;
  prevPostItem?: PostLinkItem | null;
  nextPostItem?: PostLinkItem | null;
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
  const targetSegment = isPostPage
    ? defaultSegmentType
    : HomeSiderSegmentType.INFO;
  const [panelState, setPanelState] = useState(() => ({
    path: homeInfo.currentPath,
    segment: targetSegment,
  }));
  const effectiveSegment = isPostPage
    ? panelState.path === homeInfo.currentPath
      ? panelState.segment
      : targetSegment
    : HomeSiderSegmentType.INFO;

  const defaultSegmentValue = useMemo(
    () => (isPostPage ? defaultSegmentType : HomeSiderSegmentType.INFO),
    [defaultSegmentType, isPostPage],
  );
  const panelKey = `${type}:${homeInfo.currentPath}`;

  const activeSlot =
    effectiveSegment === HomeSiderSegmentType.INFO ? (
      <div className="sider-slot" data-slot-type="info">
        <HomeInfoPanel {...homeInfo} />
      </div>
    ) : effectiveSegment === HomeSiderSegmentType.SERIES ? (
      <div className="sider-slot" data-slot-type="series">
        {isPostPage && (
          <SeriesPostList
            posts={seriesPostItems}
            currentPostSlug={currentPostSlug}
          />
        )}
      </div>
    ) : (
      <div className="sider-slot" data-slot-type="directory">
        {isPostPage && (
          <TableOfContents
            enableNumbering={tocNumbering}
            sourceHeadings={tocHeadings}
          />
        )}
      </div>
    );

  return (
    <Fragment key={panelKey}>
      {isPostPage && (
        <HomeSiderSegmented
          className="my-4 flex w-full justify-between text-sm/6"
          itemClass="grow"
          defaultValue={defaultSegmentValue}
          id={`${homeInfo.idPrefix}-segments`}
          value={effectiveSegment}
          onChange={(value) =>
            setPanelState({
              path: homeInfo.currentPath,
              segment: value,
            })
          }
        />
      )}

      <div
        className="vertical-scrollbar pt-10 scroll-gutter-stable relative block w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto md:pt-4 md:pl-3"
        data-type={type}
        data-default-type={defaultSegmentValue}>
        {activeSlot}
      </div>

      {isPostPage && (
        <SeriesNavigation
          prevPost={prevPostItem ?? null}
          nextPost={nextPostItem ?? null}
          className="w-full px-2"
        />
      )}

      <ScrollProgress className="mt-auto w-full rounded-full pt-4 sticky bottom-0" />
    </Fragment>
  );
}

export default HomeSiderPanel;
