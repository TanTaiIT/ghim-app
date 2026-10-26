import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

/*
 * Phần thiết bị của thông báo đẩy (ghim-server add-notifications): xin quyền và lấy token Expo Push. Gửi token lên
 * server là `api.setPushToken` (`./client`); server gắn token vào phiên đang dùng, đăng xuất là phiên đó thôi nhận.
 */

/** Web không có thông báo đẩy của Expo; mọi chỗ khác hỏi cờ này thay vì tự so `Platform.OS`. */
export const PUSH_SUPPORTED = Platform.OS !== 'web';

if (PUSH_SUPPORTED) {
  // App đang mở thì chuông trong app và realtime đã báo — thông báo chỉ vào danh sách của máy, không bật banner chồng.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

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
 * Token của máy này, hoặc null khi máy chưa nhận được thông báo đẩy: web, dự án chưa `eas init` (Expo không cấp token
 * khi thiếu mã dự án), hay người dùng chưa / không cho quyền. `ask` = được bật hộp thoại xin quyền của hệ điều hành —
 * hệ điều hành chỉ cho hỏi tới khi người dùng từ chối hẳn.
 */
export async function devicePushToken(ask: boolean): Promise<string | null> {
  const id = PUSH_SUPPORTED ? projectId() : null;
  if (id === null) return null;
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

export function pushTapOf(response: Notifications.NotificationResponse): PushTap {
  const data = response.notification.request.content.data;
  const conversationId = data?.['conversationId'];
  return {
    key: `${response.notification.request.identifier}:${response.actionIdentifier}`,
    conversationId: typeof conversationId === 'string' ? conversationId : null,
  };
}

/** Web không có thông báo đẩy: hook rỗng thay cho hook của Expo, gọi được vô điều kiện (rules of hooks). */
export const useLastPushResponse: () => Notifications.NotificationResponse | null | undefined =
  PUSH_SUPPORTED ? Notifications.useLastNotificationResponse : () => null;
