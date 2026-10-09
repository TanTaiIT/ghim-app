import { beforeEach, describe, expect, it } from '@jest/globals';
import { MAX_PHOTOS, snapshotDraft, useDraftStore } from './draft';

const photo = { svg: '<svg/>' };

describe('useDraftStore', () => {
  beforeEach(() => useDraftStore.getState().reset());

  it('không nhận quá số ảnh tối đa', () => {
    for (let i = 0; i < MAX_PHOTOS + 2; i++) useDraftStore.getState().addPhoto(photo);
    expect(useDraftStore.getState().photos).toHaveLength(MAX_PHOTOS);
  });

  it('bật tắt nhóm hiển thị', () => {
    const { toggleGroup } = useDraftStore.getState();
    toggleGroup('g-na');
    toggleGroup('g-hv');
    toggleGroup('g-na');
    expect(useDraftStore.getState().groupIds).toEqual(['g-hv']);
  });

  it('snapshot chỉ có dữ liệu, không kèm action', () => {
    useDraftStore.getState().patch({ title: 'MacBook', price: 13_900_000 });
    const draft = snapshotDraft();
    expect(draft.title).toBe('MacBook');
    expect(draft.price).toBe(13_900_000);
    expect('patch' in draft).toBe(false);
  });

  it('reset trả nháp về rỗng', () => {
    useDraftStore.getState().patch({ title: 'x', boostId: 'top3' });
    useDraftStore.getState().reset();
    expect(snapshotDraft().title).toBe('');
    expect(snapshotDraft().boostId).toBeNull();
  });
});
