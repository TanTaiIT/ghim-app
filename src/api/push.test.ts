import { describe, expect, it, jest } from '@jest/globals';
import type { NotificationResponse } from 'expo-notifications';
import { pushTapOf } from './push';

/** Nạp lại `./push` trên một "máy" giả: `expo-notifications` giả lập đúng lỗi native của Expo Go khi bị nạp nhầm. */
function loadOn(device: { expoGo: boolean; nativeModule: boolean }) {
  const setNotificationHandler = jest.fn();
  let supported: boolean | undefined;
  jest.isolateModules(() => {
    jest.doMock('expo', () => ({
      isRunningInExpoGo: () => device.expoGo,
      requireOptionalNativeModule: () => (device.nativeModule ? {} : null),
    }));
    jest.doMock('expo-notifications', () => {
      if (device.expoGo || !device.nativeModule) {
        throw new Error("Cannot find native module 'ExpoTopicSubscriptionModule'");
      }
      return { setNotificationHandler };
    });
    supported = (require('./push') as { PUSH_SUPPORTED: boolean }).PUSH_SUPPORTED;
  });
  return { supported, setNotificationHandler };
}

describe('máy không có module native của thông báo đẩy', () => {
  it('Expo Go: không nạp expo-notifications, app vẫn mở, tính năng tắt', () => {
    expect(loadOn({ expoGo: true, nativeModule: true }).supported).toBe(false);
  });

  it('bản build dựng trước khi cài gói: như Expo Go', () => {
    expect(loadOn({ expoGo: false, nativeModule: false }).supported).toBe(false);
  });

  it('bản build có module: bật, và đặt cách hiện thông báo lúc app đang mở', () => {
    const { supported, setNotificationHandler } = loadOn({ expoGo: false, nativeModule: true });
    expect(supported).toBe(true);
    expect(setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

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
