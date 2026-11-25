export type PostSummarySource = 'description' | 'ai' | 'auto';

export interface PostSummaryData {
  text: string;
  source: PostSummarySource;
}

export interface PostLinkItem {
  key: string;
  title: string;
  href: string;
}
