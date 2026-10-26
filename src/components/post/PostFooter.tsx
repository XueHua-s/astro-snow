import type { PostFooterData } from '@/lib/layout/footer-data';
import RandomPostList from './RandomPostList';
import RelatedPostList from './RelatedPostList';

type Props = PostFooterData;

export default function PostFooter({
  randomPosts,
  relatedPosts,
  hasSimilarityData,
  postIndexMap,
}: Props) {
  return (
    <div className="tablet:grid-cols-1 grid grid-cols-2 gap-4 px-8 tablet:px-5">
      <RandomPostList
        posts={randomPosts.slice(0, 5)}
        postIndexMap={postIndexMap}
      />
      {hasSimilarityData && (
        <RelatedPostList
          posts={relatedPosts}
          fallbackPosts={randomPosts.slice(5)}
          postIndexMap={postIndexMap}
        />
      )}
    </div>
  );
}
