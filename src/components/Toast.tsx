import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R, S, shadowLift } from '@/theme';

/** Đủ lâu để đọc một câu, đủ ngắn để không che nút kế tiếp. */
const TOAST_MS = 2600;

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn | null>(null);

/**
 * Bề mặt lỗi DUY NHẤT của app (HARD#6). Là Context chứ không phải store vì nó vừa giữ state vừa render
 * `Animated.View` — một component có state, không phải dữ liệu dùng chung.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const toast = useCallback<ToastFn>((next) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  // Timer phải dọn khi provider unmount, nếu không `setMessage` chạy trên component đã chết.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message !== null && (
        <Animated.View
          entering={FadeInUp.duration(220)}
          exiting={FadeOutUp.duration(180)}
          style={[styles.toast, { top: insets.top + S.sm }]}
          pointerEvents="none"
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast phải nằm trong <ToastProvider>');
  return toast;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: S.lg,
    right: S.lg,
    backgroundColor: C.ink,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    // Toast đứng trên mọi thứ: đây là mốc zIndex cao nhất của app, các lớp khác chèn dưới nó.
    zIndex: 100,
    ...shadowLift,
  },
  text: { color: '#fff', fontFamily: F.uiSemi, fontSize: 14, lineHeight: 20 },
});
