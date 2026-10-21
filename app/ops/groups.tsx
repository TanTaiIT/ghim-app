import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/Chip';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, IconButton, Loading, Tag } from '@/components/ui';
import { useOpsGroups } from '@/queries/ops-groups';
import { GROUP_KIND_LABEL, GROUP_STATE_LABEL, type OpsGroupState } from '@/api/ops';
import { C, F, R, S } from '@/theme';

/** Chữ đầu của hai từ đầu ("Xe cổ Sài Gòn" → "XC") như ô nhóm của bộ UI; tên một từ thì một chữ. */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

/** Bộ lọc theo trạng thái của server; "Thiếu chủ" và "Chờ giao chủ" lên trước vì đó là việc master phải làm. */
const FILTERS: (OpsGroupState | null)[] = [
  null,
  'ownerless',
  'pending_owner',
  'locked',
  'active',
  'closed',
];

/**
 * Nhóm (master). Nhóm do master lập trên bàn vận hành rồi giao chủ — server không có "yêu cầu lập nhóm" từ người dùng
 * như bộ UI vẽ, nên màn này là danh sách nhóm và nút Lập nhóm.
 */
export default function OpsGroups() {
  const router = useRouter();
  const [state, setState] = useState<OpsGroupState | null>(null);
  const groups = useOpsGroups(state);

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Nhóm"
        sub={groups.data ? `${groups.data.total} nhóm` : undefined}
        right={
          <IconButton
            icon="plus"
            label="Lập nhóm"
            variant="glass"
            onPress={() => router.push('/ops/group/new')}
          />
        }
      />
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f ?? 'all'}
              label={f ? GROUP_STATE_LABEL[f] : 'Tất cả'}
              selected={f === state}
              onPress={() => setState(f)}
            />
          ))}
        </ScrollView>
      </View>
      {groups.isPending ? (
        <Loading />
      ) : groups.isError ? (
        <EmptyState icon="lock" text={groups.error.message} />
      ) : (
        <FlatList
          data={groups.data.items}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="users" text="Không có nhóm nào ở mục này." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/ops/group/${item.id}`)}
              style={styles.row}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{initials(item.name)}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta}>
                  {GROUP_KIND_LABEL[item.kind]} · {item.memberCount} thành viên
                </Text>
              </View>
              <Tag
                label={GROUP_STATE_LABEL[item.state]}
                tone={
                  item.state === 'active' ? 'brand' : item.state === 'closed' ? 'neutral' : 'amber'
                }
              />
              <Feather name="chevron-right" size={18} color={C.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  chips: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md },
  list: { paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: R.sm,
    backgroundColor: C.brandLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: F.uiBold, fontSize: 15, color: C.brandDark },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
});
