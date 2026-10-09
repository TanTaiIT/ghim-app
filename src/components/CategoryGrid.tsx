import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { CategoryId } from '@/api/client';
import { useCategories } from '@/queries/selling';
import { C, F, R, S, TONE, type Tone } from '@/theme';

type Cell = { id: CategoryId; icon: ComponentProps<typeof Ionicons>['name']; tone: Tone };

/**
 * Bảy ô danh mục của thiết kế + "Tất cả". Icon và màu là chuyện giao diện nên nằm ở đây; tên lấy từ
 * danh sách danh mục (backend đổi tên thì lưới đổi theo). Danh mục không có ô vẫn tìm được qua "Tất cả".
 * Bộ Ionicons thay cho Feather ở lưới này vì Feather không có áo, sofa, xe.
 */
const CELLS: Cell[] = [
  { id: 'phone', icon: 'phone-portrait-outline', tone: 'indigo' },
  { id: 'laptop', icon: 'laptop-outline', tone: 'purple' },
  { id: 'fashion', icon: 'shirt-outline', tone: 'pink' },
  { id: 'furniture', icon: 'bed-outline', tone: 'amber' },
  { id: 'vehicle', icon: 'bicycle-outline', tone: 'teal' },
  { id: 'property', icon: 'home-outline', tone: 'green' },
  { id: 'jobs', icon: 'briefcase-outline', tone: 'navy' },
];

export function CategoryGrid() {
  const router = useRouter();
  const categories = useCategories();
  const nameOf = (id: CategoryId) => categories.data?.find((c) => c.id === id)?.name ?? '';

  return (
    <View style={styles.grid}>
      {CELLS.map((cell) => (
        <Tile
          key={cell.id}
          label={nameOf(cell.id)}
          icon={cell.icon}
          tone={cell.tone}
          onPress={() => router.push({ pathname: '/search', params: { category: cell.id } })}
        />
      ))}
      <Tile
        label="Tất cả"
        icon="grid-outline"
        tone="slate"
        onPress={() => router.push('/search')}
      />
    </View>
  );
}

function Tile({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: Cell['icon'];
  tone: Tone;
  onPress: () => void;
}) {
  const t = TONE[tone];
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.cell}
    >
      <View style={[styles.icon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={24} color={t.fg} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md },
  cell: { width: '25%', alignItems: 'center', gap: S.sm },
  icon: {
    width: 52,
    height: 52,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: F.uiMedium, fontSize: 12, color: C.ink },
});
