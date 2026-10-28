import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import type * as NotificationsLib from 'expo-notifications';

/*
 * Phần thiết bị của thông báo đẩy (ghim-server add-notifications): xin quyền và lấy token Expo Push. Gửi token lên
 * server là `api.setPushToken` (`./client`); server gắn token vào phiên đang dùng, đăng xuất là phiên đó thôi nhận.
 */

/**
 * `expo-notifications` đòi module native ngay lúc được nạp: Expo Go trên Android thiếu `ExpoTopicSubscriptionModule`,
 * bản build dựng trước khi cài gói thì thiếu hết — nạp ở đầu file là app chết ở màn đầu (lý do gỡ lần đầu, 26/10/2026).
 * Nên chỉ `require` khi máy có module; thiếu thì cả tính năng lặng lẽ tắt.
 */
const Notifications: typeof NotificationsLib | null =
  Platform.OS !== 'web' &&
  !isRunningInExpoGo() &&
  requireOptionalNativeModule('ExpoPushTokenManager') !== null
    ? (require('expo-notifications') as typeof NotificationsLib)
    : null;

/** Mọi chỗ khác hỏi cờ này thay vì tự so nền tảng — nó gồm cả web, Expo Go lẫn bản build cũ. */
export const PUSH_SUPPORTED = Notifications !== null;

// App đang mở thì chuông trong app và realtime đã báo — thông báo chỉ vào danh sách của máy, không bật banner chồng.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** `eas init` ghi mã dự án vào `app.json` (`extra.eas.projectId`); bản build EAS mang nó ở `easConfig`. */
function projectId(): string | null {
  const extra: unknown = Constants.expoConfig?.extra?.['eas'];
  if (typeof extra === 'object' && extra !== null && 'projectId' in extra) {
    const id: unknown = extra.projectId;
    if (typeof id === 'string' && id !== '') return id;
  }
  return Constants.easConfig?.projectId ?? null;
}

/**
 * Token của máy này, hoặc null khi máy chưa nhận được thông báo đẩy: `PUSH_SUPPORTED` sai, thiếu mã dự án EAS (Expo
 * không cấp token), hay người dùng chưa / không cho quyền. `ask` = được bật hộp thoại xin quyền của hệ điều hành — hệ
 * điều hành chỉ cho hỏi tới khi người dùng từ chối hẳn.
 */
export async function devicePushToken(ask: boolean): Promise<string | null> {
  const id = projectId();
  if (Notifications === null || id === null) return null;
  const current = await Notifications.getPermissionsAsync();
  const status =
    current.status !== 'granted' && ask && current.canAskAgain
      ? (await Notifications.requestPermissionsAsync()).status
      : current.status;
  if (status !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
}

/** Thông báo người dùng vừa bấm: chỉ những gì app cần để mở đúng màn. */
export type PushTap = { key: string; conversationId: string | null };

export function pushTapOf(response: NotificationsLib.NotificationResponse): PushTap {
  const data = response.notification.request.content.data;
  const conversationId = data?.['conversationId'];
  return {
    key: `${response.notification.request.identifier}:${response.actionIdentifier}`,
    conversationId: typeof conversationId === 'string' ? conversationId : null,
  };
}

/** Máy không có thông báo đẩy: hook rỗng thay cho hook của Expo, gọi được vô điều kiện (rules of hooks). */
export const useLastPushResponse: () => NotificationsLib.NotificationResponse | null | undefined =
  Notifications?.useLastNotificationResponse ?? (() => null);
