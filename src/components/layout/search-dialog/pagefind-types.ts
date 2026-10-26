export interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
}

export interface SearchRequest {
  /** One normalized query/worker owns this ID; pagination reuses the engine. */
  id: number;
  term: string;
  limit: number;
  bundlePath: string;
  language: string;
}

export type SearchResponse =
  | { id: number; results: SearchResult[]; total: number }
  | { id: number; error: 'module' | 'index' };
