import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Photo } from './Photo';
import { C, F, R, S } from '@/theme';

export type GridPhoto = { key: string; uri: string; uploaded: boolean; failed: boolean };

/**
 * Lưới ảnh 3 × 2 của bước 1 đăng tin: ô "Thêm ảnh" đứng đầu, ảnh đầu tiên gắn nhãn "Ảnh bìa", ô trống
 * lấp cho đủ lưới để người đăng thấy còn bao nhiêu chỗ. Mỗi ô tự báo trạng thái tải của nó — ảnh hỏng thì
 * chạm vào ô để tải lại; đây là bề mặt lỗi duy nhất của ảnh (query.convention §9).
 */
export function PhotoGrid({
  photos,
  max,
  onAdd,
  onRemove,
  onRetry,
}: {
  photos: GridPhoto[];
  max: number;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}) {
  const canAdd = photos.length < max;
  const blanks = Math.max(0, max - photos.length - (canAdd ? 1 : 0));

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.h2}>Hình ảnh sản phẩm</Text>
        <Text style={styles.small}>
          {photos.length} / {max}
        </Text>
      </View>
      <View style={styles.grid}>
        {canAdd && (
          <Pressable accessibilityRole="button" onPress={onAdd} style={[styles.cell, styles.add]}>
            <Feather name="camera" size={24} color={C.brand} />
            <Text style={styles.addText}>Thêm ảnh</Text>
          </Pressable>
        )}
        {photos.map((p, i) => (
          <View key={p.key} style={styles.cell}>
            <Photo picture={{ uri: p.uri }} style={styles.fill} />
            {!p.uploaded && !p.failed && (
              <View style={styles.veil} accessibilityLabel="Đang tải ảnh">
                <ActivityIndicator color={C.paperWarm} />
              </View>
            )}
            {p.failed && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tải lại ảnh"
                onPress={() => onRetry(p.key)}
                style={styles.veil}
              >
                <Feather name="refresh-cw" size={20} color={C.paperWarm} />
                <Text style={styles.veilText}>Lỗi · Thử lại</Text>
              </Pressable>
            )}
            {i === 0 && (
              <View style={styles.cover}>
                <Text style={styles.coverText}>Ảnh bìa</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xoá ảnh"
              hitSlop={8}
              onPress={() => onRemove(p.key)}
              style={styles.remove}
            >
              <Feather name="x" size={12} color={C.paperWarm} />
            </Pressable>
          </View>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <View key={`blank-${i}`} style={[styles.cell, styles.blank]} />
        ))}
      </View>
      <Text style={styles.small}>
        Ảnh rõ nét giúp tin được xem nhiều hơn. Ảnh đầu tiên là ảnh bìa.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.sm },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Ba ô một hàng với khe 10: (100% - 2 × 10) / 3 ≈ 31.5% — để phần trăm chứ không đo màn hình.
  cell: { width: '31.5%', aspectRatio: 1, borderRadius: R.md, overflow: 'hidden' },
  fill: { flex: 1 },
  add: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.brandBright,
    backgroundColor: C.brandWash,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addText: { fontFamily: F.uiBold, fontSize: 12, color: C.brand },
  blank: { backgroundColor: C.sand },
  veil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.xs,
  },
  veilText: { fontFamily: F.uiBold, fontSize: 11, color: C.paperWarm },
  cover: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    height: 20,
    paddingHorizontal: S.sm,
    borderRadius: R.full,
    backgroundColor: C.ink,
    justifyContent: 'center',
  },
  coverText: { fontFamily: F.uiBold, fontSize: 10, color: C.paperWarm },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: R.full,
    backgroundColor: C.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
