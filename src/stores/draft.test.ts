import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  hasPendingUploads,
  MAX_PHOTOS,
  snapshotDraft,
  uploadedImageIds,
  useDraftStore,
} from './draft';

const picked = { uri: 'file:///a.jpg', width: 4032, height: 3024 };

describe('useDraftStore', () => {
  beforeEach(() => useDraftStore.getState().reset());

  it('không nhận quá số ảnh tối đa, trả key của đúng những ảnh nhận được', () => {
    const keys = useDraftStore
      .getState()
      .addPhotos(Array.from({ length: MAX_PHOTOS + 2 }, () => picked));
    expect(keys).toHaveLength(MAX_PHOTOS);
    expect(new Set(keys).size).toBe(MAX_PHOTOS);
    expect(useDraftStore.getState().addPhotos([picked])).toEqual([]);
  });

  it('ảnh đang tải khoá nút gửi; tải xong vào danh sách id theo thứ tự lưới, ảnh hỏng thì không', () => {
    const [a, b, c] = useDraftStore.getState().addPhotos([picked, picked, picked]);
    const { setPhoto } = useDraftStore.getState();
    expect(hasPendingUploads(snapshotDraft())).toBe(true);
    setPhoto(c ?? '', { imageId: 'img-c' });
    setPhoto(a ?? '', { imageId: 'img-a' });
    setPhoto(b ?? '', { failed: true });
    expect(hasPendingUploads(snapshotDraft())).toBe(false);
    expect(uploadedImageIds(snapshotDraft())).toEqual(['img-a', 'img-c']);
  });

  it('xoá ảnh theo key, không theo vị trí', () => {
    const [a, b] = useDraftStore
      .getState()
      .addPhotos([picked, { ...picked, uri: 'file:///b.jpg' }]);
    useDraftStore.getState().removePhoto(a ?? '');
    expect(useDraftStore.getState().photos.map((p) => p.key)).toEqual([b]);
  });

  it('snapshot chỉ có dữ liệu; reset trả form về rỗng', () => {
    useDraftStore.getState().patch({ title: 'MacBook', price: 13_900_000, listingId: 'l-1' });
    const draft = snapshotDraft();
    expect(draft).toMatchObject({ title: 'MacBook', price: 13_900_000, listingId: 'l-1' });
    expect('patch' in draft).toBe(false);
    useDraftStore.getState().reset();
    expect(snapshotDraft()).toMatchObject({ title: '', listingId: null, photos: [] });
  });
});
