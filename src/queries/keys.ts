import type { SearchFilters } from '@/api/client';

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
  sessions: () => ['me', 'sessions'] as const,
  blocks: () => ['me', 'blocks'] as const,
  standing: () => ['me', 'standing'] as const,
  categories: () => ['categories'] as const,
  provinces: () => ['regions', 'provinces'] as const,
  wards: (provinceCode: number) => ['regions', 'wards', provinceCode] as const,
  template: (categoryId: string) => ['categories', 'template', categoryId] as const,
  listings: {
    all: () => ['listings'] as const,
    search: (f: SearchFilters) => ['listings', 'search', f] as const,
    detail: (id: string) => ['listings', 'detail', id] as const,
    similar: (id: string) => ['listings', 'similar', id] as const,
    mine: () => ['listings', 'mine'] as const,
    editable: (id: string) => ['listings', 'editable', id] as const,
    saved: () => ['listings', 'saved'] as const,
    bySeller: (id: string) => ['listings', 'seller', id] as const,
  },
  seller: (id: string) => ['users', id] as const,
  savedIds: () => ['saved-ids'] as const,
  savedSearches: () => ['saved-searches'] as const,
  groups: {
    all: () => ['groups'] as const,
    mine: () => ['groups', 'mine'] as const,
    search: (q: string) => ['groups', 'search', q] as const,
    code: (code: string) => ['groups', 'code', code] as const,
    invites: () => ['groups', 'invites'] as const,
    muted: () => ['groups', 'muted'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    listings: (id: string) => ['groups', 'listings', id] as const,
    announcements: (id: string) => ['groups', 'announcements', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
  },
  conversations: {
    all: () => ['conversations'] as const,
    list: () => ['conversations', 'list'] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
  },
  notices: {
    all: () => ['notices'] as const,
    list: () => ['notices', 'list'] as const,
    unread: () => ['notices', 'unread'] as const,
  },
  help: () => ['help'] as const,
  /** Bàn vận hành: một gốc `ops` để đăng xuất / mất quyền thì quét được cả nhánh. */
  ops: {
    all: () => ['ops'] as const,
    board: () => ['ops', 'board'] as const,
    tasks: (queue: number | null) => ['ops', 'tasks', queue] as const,
    task: (id: string) => ['ops', 'task', id] as const,
    reasons: () => ['ops', 'reasons'] as const,
    idChecksAll: () => ['ops', 'id-checks'] as const,
    idChecks: (status: string | null) => ['ops', 'id-checks', status] as const,
    strikes: (accountId: string) => ['ops', 'strikes', accountId] as const,
    /** Danh sách theo trạng thái lẫn hồ sơ từng nhóm — đổi trạng thái nhóm làm lệch cả hai. */
    groupsAll: () => ['ops', 'groups'] as const,
    groups: (state: string | null) => ['ops', 'groups', 'list', state] as const,
    group: (id: string) => ['ops', 'groups', 'detail', id] as const,
    supportAll: () => ['ops', 'support'] as const,
    support: (pendingOnly: boolean) => ['ops', 'support', pendingOnly] as const,
    thread: (id: string) => ['ops', 'thread', id] as const,
    categories: () => ['ops', 'categories'] as const,
    screeningRules: () => ['ops', 'screening-rules'] as const,
  },
};
