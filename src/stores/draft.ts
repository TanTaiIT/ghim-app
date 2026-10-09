import { create } from 'zustand';

/*
 * Nháp tin đang đăng — sống qua ba màn của luồng đăng tin (HARD#16: state sống lâu hơn một màn hình).
 * Chỉ giữ trong bộ nhớ: đóng app là mất nháp. Lưu nháp bền cần chỗ chứa lớn hơn SecureStore (~2KB,
 * xem `./auth`) và ảnh thật cần `add-media`; cả hai chưa có nên chưa persist.
 *
 * Khai lại type thay vì import từ `@/api`: store là lá, không import layer khác (folder §6).
 */

type Condition = 'new' | 'like-new' | 'used';

type DraftPicture = { uri: string } | { svg: string };

export type Draft = {
  photos: DraftPicture[];
  title: string;
  categoryId: string | null;
  brand: string | null;
  condition: Condition | null;
  price: number;
  allowOffers: boolean;
  /** Theo nhãn thông số của danh mục (`Category.specKeys`). */
  specs: Record<string, string>;
  description: string;
  /** null = dùng khu vực mặc định của tài khoản. */
  place: { district: string; city: string } | null;
  groupIds: string[];
  boostId: string | null;
};

/** Giới hạn của thiết kế: lưới ảnh 3 × 2 ở bước 1. */
export const MAX_PHOTOS = 6;
export const MAX_TITLE = 70;

const EMPTY: Draft = {
  photos: [],
  title: '',
  categoryId: null,
  brand: null,
  condition: null,
  price: 0,
  allowOffers: true,
  specs: {},
  description: '',
  place: null,
  groupIds: [],
  boostId: null,
};

type DraftState = Draft & {
  patch: (next: Partial<Draft>) => void;
  addPhoto: (photo: DraftPicture) => void;
  removePhoto: (index: number) => void;
  toggleGroup: (id: string) => void;
  reset: () => void;
};

export const useDraftStore = create<DraftState>()((set) => ({
  ...EMPTY,
  patch: (next) => set(next),
  addPhoto: (photo) =>
    set((s) => (s.photos.length >= MAX_PHOTOS ? s : { photos: [...s.photos, photo] })),
  removePhoto: (index) => set((s) => ({ photos: s.photos.filter((_, i) => i !== index) })),
  toggleGroup: (id) =>
    set((s) => ({
      groupIds: s.groupIds.includes(id) ? s.groupIds.filter((g) => g !== id) : [...s.groupIds, id],
    })),
  reset: () => set(EMPTY),
}));

/** Ảnh chụp nháp hiện tại (không kèm action) — đưa cho `usePublishListing`. */
export function snapshotDraft(): Draft {
  const {
    patch: _p,
    addPhoto: _a,
    removePhoto: _r,
    toggleGroup: _t,
    reset: _x,
    ...draft
  } = useDraftStore.getState();
  return draft;
}
