import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { IconButton, useBack } from './ui';
import { C, F, R, S } from '@/theme';

const STEPS = 3;

/**
 * Đóng cả luồng đăng tin từ bất kỳ bước nào. `router.back()` ở bước 2–3 chỉ lùi một bước trong stack
 * con `app/post/`, nên phải lùi ở navigator cha — stack gốc đang giữ cả luồng như một màn.
 */
export function useClosePost() {
  const navigation = useNavigation();
  return () => navigation.getParent()?.goBack();
}

/** Đầu màn của ba bước đăng tin: nút đóng/lùi, "Lưu nháp", thanh tiến trình và nhãn bước. */
export function StepHeader({
  step,
  caption,
  onSaveDraft,
}: {
  step: 1 | 2 | 3;
  caption: string;
  onSaveDraft?: () => void;
}) {
  const back = useBack();
  const first = step === 1;
  let right: ReactNode = <View style={styles.side} />;
  if (onSaveDraft) {
    right = (
      <Pressable accessibilityRole="button" onPress={onSaveDraft} style={styles.side}>
        <Text style={styles.save}>Lưu nháp</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <IconButton
          icon={first ? 'x' : 'chevron-left'}
          label={first ? 'Đóng' : 'Quay lại'}
          onPress={back}
        />
        <Text style={styles.title}>Đăng tin mới</Text>
        {right}
      </View>
      <View style={styles.progressBlock}>
        <View style={styles.progress}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.segment, i < step && styles.segmentOn]} />
          ))}
        </View>
        <Text style={styles.caption}>
          <Text style={styles.stepNo}>
            Bước {step}/{STEPS}
          </Text>{' '}
          · {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: S.xs,
    paddingHorizontal: S.sm,
    paddingBottom: S.md,
    gap: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: F.uiBold, fontSize: 17, color: C.ink },
  side: { width: 88, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  save: { paddingHorizontal: S.md, fontFamily: F.uiBold, fontSize: 14, color: C.brandTx },
  progressBlock: { paddingHorizontal: S.sm, gap: 6 },
  progress: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: R.full, backgroundColor: C.line },
  segmentOn: { backgroundColor: C.brandBright },
  caption: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  stepNo: { fontFamily: F.uiBold, color: C.brandTx },
});
