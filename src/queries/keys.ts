import type { CategoryId, SearchFilters } from '@/api/client';

/**
 * Key factory — nơi DUY NHẤT đặt query key (HARD#3). Call-site không viết array literal.
 *
 * `as const` trên từng return là bắt buộc: TanStack cần key là readonly tuple để suy luận đúng.
 * Thêm key mới = thêm một hàm vào đây, kể cả key không tham số. Key con mở đầu bằng key `all()` của
 * nhóm để `invalidateQueries({ queryKey: qk.listings.all() })` quét được cả nhóm.
 */
export const qk = {
  health: () => ['health'] as const,
  me: () => ['me'] as const,
  categories: () => ['categories'] as const,
  categorySuggestion: (title: string) => ['categories', 'suggest', title] as const,
  districts: () => ['districts'] as const,
  priceHint: (categoryId: CategoryId) => ['price-hint', categoryId] as const,
  boostPlans: () => ['boost-plans'] as const,
  samplePhotos: () => ['sample-photos'] as const,
  listings: {
    all: () => ['listings'] as const,
    featured: () => ['listings', 'featured'] as const,
    nearby: () => ['listings', 'nearby'] as const,
    search: (f: SearchFilters) => ['listings', 'search', f] as const,
    detail: (id: string) => ['listings', 'detail', id] as const,
    similar: (id: string) => ['listings', 'similar', id] as const,
    mine: (state: 'active' | 'sold') => ['listings', 'mine', state] as const,
    saved: () => ['listings', 'saved'] as const,
  },
  savedIds: () => ['saved-ids'] as const,
  savedSearches: () => ['saved-searches'] as const,
  groups: {
    all: () => ['groups'] as const,
    mine: () => ['groups', 'mine'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    listings: (id: string) => ['groups', 'listings', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
  },
  conversations: {
    all: () => ['conversations'] as const,
    list: () => ['conversations', 'list'] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
  },
  notices: () => ['notices'] as const,
  help: () => ['help'] as const,
};
