import { StyleSheet, Text, View } from 'react-native';
import { PinButton } from './ui';
import { C, F, S } from '@/theme';

/** Màn cuối cùng khi render vỡ — không phụ thuộc query hay store, vì chính chúng có thể là thủ phạm. */
export function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Có lỗi xảy ra</Text>
      <Text style={styles.message}>{error.message}</Text>
      <PinButton label="Thử lại" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xl,
    gap: S.md,
  },
  title: { fontFamily: F.uiBlack, fontSize: 20, color: C.ink },
  message: { fontFamily: F.ui, fontSize: 14, color: C.inkSoft, textAlign: 'center' },
});
