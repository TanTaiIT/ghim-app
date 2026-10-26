import { describe, expect, it } from '@jest/globals';
import type { NotificationResponse } from 'expo-notifications';
import { pushTapOf } from './push';

const response = (id: string, data: Record<string, unknown>): NotificationResponse =>
  ({
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { identifier: id, content: { data } } },
  }) as unknown as NotificationResponse;

describe('bấm thông báo đẩy', () => {
  it('tin nhắn mang mã hội thoại; mỗi lượt bấm một khoá riêng', () => {
    expect(pushTapOf(response('n-1', { conversationId: 'c-1', type: 'message.new' }))).toEqual({
      key: 'n-1:expo.modules.notifications.actions.DEFAULT',
      conversationId: 'c-1',
    });
  });

  it('thông báo không gắn hội thoại, hay dữ liệu sai kiểu: không có mã hội thoại', () => {
    expect(pushTapOf(response('n-2', { listingId: 'l-1' })).conversationId).toBeNull();
    expect(pushTapOf(response('n-3', { conversationId: 42 })).conversationId).toBeNull();
  });
});
