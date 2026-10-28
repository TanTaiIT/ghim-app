import { useEffect } from 'react';
import { Stack, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
} from '@expo-google-fonts/be-vietnam-pro';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorScreen } from '@/components/ErrorScreen';
import { ToastProvider } from '@/components/Toast';
import { useAuthBridge } from '@/queries/auth';
import { usePushBridge, usePushTaps } from '@/queries/push';
import { useRealtimeBridge } from '@/queries/realtime';
import { useAuthHydrated, useIsAuthenticated } from '@/stores/auth';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Default của QueryClient nằm ở một chỗ duy nhất (query.convention §7); hook chỉ override khi có WHY. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/**
 * Lưới an toàn cuối cùng cho lỗi render — expo-router tự bọc route bằng component tên `ErrorBoundary`
 * nếu file export nó. Dùng `queryClient` ở module scope chứ không `useQueryClient()`: boundary được
 * dựng NGOÀI `<QueryClientProvider>` bên dưới. `clear()` trước `retry()` vì nguyên nhân thường là dữ
 * liệu xấu đang nằm trong cache.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ErrorScreen
      error={error}
      onRetry={() => {
        queryClient.clear();
        retry();
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
  });
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authHydrated = useAuthHydrated();
  useAuthBridge(queryClient);
  useRealtimeBridge(queryClient);
  usePushBridge();

  // Font lỗi vẫn chạy tiếp, rơi về font hệ thống. Phiên phải đọc xong mới dựng Stack: guard chạy sớm
  // sẽ nháy qua màn login rồi mới nhảy vào đúng chỗ.
  const ready = (fontsLoaded || fontsError !== null) && authHydrated;

  // Push chỉ mang mã hội thoại, không mang nhóm thông báo: tin nhắn mở thẳng hội thoại, chuyện khác mở mục Thông báo —
  // ở đó có đủ dữ kiện để mở đúng màn và đánh dấu đã đọc.
  usePushTaps(ready, (tap) =>
    tap.conversationId
      ? router.push(`/chat/${tap.conversationId}`)
      : router.navigate('/(tabs)/notifications'),
  );

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              {/* Chỉ khách mới thấy các màn này; đã có phiên thì chúng biến mất khỏi stack. */}
              <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                <Stack.Screen name="register" options={{ presentation: 'modal' }} />
                <Stack.Screen name="forgot-password" options={{ presentation: 'modal' }} />
                <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
              </Stack.Protected>
              {/* Kênh hỗ trợ không cần phiên: mở từ màn đăng nhập (bị khoá) lẫn từ "Cảnh cáo của tôi". */}
              <Stack.Screen name="lock-appeal" options={{ presentation: 'modal' }} />
              {/*
               * Route cần đăng nhập khai trong khối này (HARD#17). Screen không nằm đây vẫn được
               * expo-router đăng ký theo file path và mở được bằng deep link — tức không hề được bảo vệ.
               */}
              <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen name="chat/[id]" />
                <Stack.Screen name="groups" />
                {/* Quản trị nhóm là stack con sau chốt này; trang nhóm `group/[id]` khách cũng xem được nên không nằm đây. */}
                <Stack.Screen name="group/manage" />
                <Stack.Screen name="help" />
                <Stack.Screen name="reports" />
                <Stack.Screen name="verify-id" />
                <Stack.Screen name="saved-searches" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="warnings" />
                {/* Bàn vận hành: server mới là cổng thật (master, hoặc staff có quyền đang hiệu lực), xem `app/ops/_layout.tsx`. */}
                <Stack.Screen name="ops" />
                {/* Luồng đăng tin là một stack con; đóng bằng nút X ở bước 1 như thiết kế. */}
                <Stack.Screen name="post" options={{ presentation: 'fullScreenModal' }} />
              </Stack.Protected>
            </Stack>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
