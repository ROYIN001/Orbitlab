/** Type-only contract: a classic service worker must not share runtime chunks with the page. */
export interface OfflineResources {
  version: string;
  complete: boolean;
  pageMatches: boolean;
  total: number;
  cached: number;
  bytes: number;
  missing: string[];
  dates: Record<string, string | null>;
  packs: Record<string, { title: { en: string; ru?: string; th?: string }; count: number }>;
}

export type OfflineFailure = 'storage' | 'download' | 'version';
export type OfflineReply = { resources?: OfflineResources; error?: OfflineFailure };
