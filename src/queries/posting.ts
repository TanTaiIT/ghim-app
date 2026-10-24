import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type DraftRef,
  IMAGE_TOO_SMALL,
  type ListingContent,
  type PickedPhoto,
} from '@/api/client';
import { ApiError } from '@/api/http';
import { uploadedImageIds, useDraftStore, type Draft } from '@/stores/draft';
import { qk } from './keys';

/*
 * Luồng đăng tin trên server: nháp → ảnh → lưu → gửi duyệt; mở lại nháp hay tin đang hiển thị để sửa.
 * Form nằm ở `useDraftStore`; các hook ở đây ghi `listingId`/`version` của bản server vào đó.
 */

const contentOf = (d: Draft): ListingContent => ({
  title: d.title,
  description: d.description,
  price: d.price,
  negotiable: d.negotiable,
  categoryId: d.categoryId,
  attributes: d.attributes,
  provinceCode: d.provinceCode,
  wardCode: d.wardCode,
  imageIds: uploadedImageIds(d),
  placement: d.placement,
  groupId: d.groupId,
  badgeGroupId: d.badgeGroupId,
});

let creating: Promise<DraftRef> | null = null;

/**
 * Bản nháp mà form ghi vào — tạo ở lần cần đầu tiên: ảnh đầu tiên (quyền tải ảnh gắn với mã nháp), hay "Lưu
 * nháp" khi chưa có ảnh nào. Chọn 6 ảnh một lượt là 6 lượt tải cùng lúc, nên việc tạo đi một luồng — không
 * thì mỗi ảnh mở một nháp riêng.
 */
function ensureDraft(): Promise<DraftRef> {
  const { listingId, version } = useDraftStore.getState();
  if (listingId && version !== null) return Promise.resolve({ id: listingId, version });
  creating ??= api
    .createDraft()
    .then((ref) => {
      useDraftStore.getState().patch({ listingId: ref.id, version: ref.version });
      return ref;
    })
    .finally(() => {
      creating = null;
    });
  return creating;
}

async function saveContent(d: Draft): Promise<DraftRef> {
  const next = await api.saveListing(await ensureDraft(), contentOf(d));
  useDraftStore.getState().patch({ version: next.version });
  return next;
}

/**
 * Mỗi ảnh tải độc lập; hỏng thì ô ảnh đó báo, không toast — bề mặt lỗi của ảnh là chính ô ảnh
 * (query.convention §9). Ghi kết quả ở callback của hook vì callback truyền vào `mutate()` chỉ chạy cho lượt
 * gọi cuối, mà chọn nhiều ảnh là nhiều lượt cùng lúc.
 */
export function useUploadPhoto() {
  return useMutation({
    mutationFn: async ({ photo }: { key: string; photo: PickedPhoto }) =>
      api.uploadPhoto((await ensureDraft()).id, photo),
    onSuccess: (imageId, { key }) =>
      useDraftStore.getState().setPhoto(key, { imageId, failed: false, rejected: null }),
    onError: (e, { key }) =>
      useDraftStore.getState().setPhoto(key, {
        failed: true,
        rejected: e instanceof ApiError && e.code === IMAGE_TOO_SMALL ? e.message : null,
      }),
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveContent,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.mine() }),
  });
}

/** Nháp: lưu rồi gửi duyệt. Tin đang hiển thị: chỉ lưu — server tự đưa nội dung đã sửa qua máy duyệt. */
export function usePublishListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Draft) => {
      const ref = await saveContent(d);
      if (!d.editingLive) await api.submitListing(ref);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.all() }),
  });
}

/**
 * Nạp tin của chính mình vào form: làm tiếp một nháp, hay "Sửa" tin đang hiển thị. Đọc mới mỗi lần
 * (`staleTime: 0`) vì `version` cũ là lượt lưu đầu tiên bị server từ chối.
 */
export function useOpenForEdit() {
  const qc = useQueryClient();
  return async (id: string) => {
    const l = await qc.fetchQuery({
      queryKey: qk.listings.editable(id),
      queryFn: () => api.getEditable(id),
      staleTime: 0,
    });
    useDraftStore.getState().load({
      listingId: l.id,
      version: l.version,
      editingLive: l.state === 'live',
      photos: l.photos.map((p) => ({
        key: `server-${p.imageId}`,
        uri: p.uri,
        width: 0,
        height: 0,
        imageId: p.imageId,
        failed: false,
        rejected: null,
      })),
      title: l.title,
      categoryId: l.categoryId,
      price: l.price,
      negotiable: l.negotiable,
      attributes: l.attributes,
      description: l.description,
      provinceCode: l.provinceCode,
      wardCode: l.wardCode,
      placement: l.placement,
      groupId: l.groupId,
      badgeGroupId: l.badgeGroupId,
    });
  };
}
