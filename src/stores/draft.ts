import { create } from 'zustand';

/*
 * Form tin đang soạn — sống qua ba màn của luồng đăng tin (HARD#16). Không phải bản sao của server:
 * `listingId`/`version` chỉ trỏ tới bản nháp trên server mà form đang ghi vào. Chỉ giữ trong bộ nhớ — đóng
 * app là mất phần chưa lưu, còn bản đã "Lưu nháp" nằm trên server và mở lại được từ Cá nhân › Đang đăng.
 *
 * Khai lại type thay vì import từ `@/api`: store là lá, không import layer khác (folder §6).
 */

/** Ảnh trong lưới: có `imageId` khi đã tải xong; `failed` thì người đăng chạm để tải lại từ `uri`. */
export type DraftPhoto = {
  key: string;
  uri: string;
  width: number;
  height: number;
  imageId: string | null;
  failed: boolean;
};

export type Draft = {
  listingId: string | null;
  version: number | null;
  /** Sửa tin đang hiển thị: lưu là xong, không gửi duyệt lại — server tự đưa nội dung sửa qua máy. */
  editingLive: boolean;
  photos: DraftPhoto[];
  title: string;
  categoryId: string | null;
  price: number;
  negotiable: boolean;
  /** Theo `name` của ô trong mẫu thông số danh mục; ô chọn nhiều là mảng. */
  attributes: Record<string, string | string[]>;
  description: string;
  provinceCode: number | null;
  wardCode: number | null;
  placement: 'marketplace' | 'group_public' | 'members_only';
  groupId: string | null;
  badgeGroupId: string | null;
};

/** Lưới 3 × 2 của thiết kế, cũng là trần mặc định của server (`listing.maxImages`). */
export const MAX_PHOTOS = 6;
/** Thiết kế đếm "x / 70"; server cho tới 120 nên trần này không bao giờ vướng server. */
export const MAX_TITLE = 70;

const EMPTY: Draft = {
  listingId: null,
  version: null,
  editingLive: false,
  photos: [],
  title: '',
  categoryId: null,
  price: 0,
  negotiable: true,
  attributes: {},
  description: '',
  provinceCode: null,
  wardCode: null,
  placement: 'marketplace',
  groupId: null,
  badgeGroupId: null,
};

let seq = 0;
const nextKey = () => `p-${Date.now().toString(36)}-${++seq}`;

type DraftState = Draft & {
  patch: (next: Partial<Draft>) => void;
  /** Trả key của những ảnh nhận được — chọn quá số chỗ còn lại thì phần thừa bị bỏ. */
  addPhotos: (picked: { uri: string; width: number; height: number }[]) => string[];
  setPhoto: (key: string, next: Partial<Pick<DraftPhoto, 'imageId' | 'failed'>>) => void;
  removePhoto: (key: string) => void;
  load: (draft: Draft) => void;
  reset: () => void;
};

export const useDraftStore = create<DraftState>()((set, get) => ({
  ...EMPTY,
  patch: (next) => set(next),
  addPhotos: (picked) => {
    const room = Math.max(0, MAX_PHOTOS - get().photos.length);
    const added = picked
      .slice(0, room)
      .map((p) => ({ ...p, key: nextKey(), imageId: null, failed: false }));
    set((s) => ({ photos: [...s.photos, ...added] }));
    return added.map((p) => p.key);
  },
  setPhoto: (key, next) =>
    set((s) => ({ photos: s.photos.map((p) => (p.key === key ? { ...p, ...next } : p)) })),
  removePhoto: (key) => set((s) => ({ photos: s.photos.filter((p) => p.key !== key) })),
  load: (draft) => set(draft),
  reset: () => set(EMPTY),
}));

/** Ảnh chụp form hiện tại (không kèm action) — đưa cho mutation lưu / đăng. */
export function snapshotDraft(): Draft {
  const {
    patch: _p,
    addPhotos: _a,
    setPhoto: _s,
    removePhoto: _r,
    load: _l,
    reset: _x,
    ...draft
  } = useDraftStore.getState();
  return draft;
}

/** Ảnh đã tải xong theo đúng thứ tự trong lưới — ảnh đầu là ảnh bìa. */
export const uploadedImageIds = (d: Draft): string[] =>
  d.photos.flatMap((p) => (p.imageId ? [p.imageId] : []));

/** Còn ảnh đang tải (chưa có id, chưa hỏng): khoá nút gửi cho tới khi xong (query.convention §9). */
export const hasPendingUploads = (d: Draft): boolean =>
  d.photos.some((p) => p.imageId === null && !p.failed);
