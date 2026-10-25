import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, IconButton, Loading, Tag } from '@/components/ui';
import { useOpsCategories } from '@/queries/ops-catalog';
import { useAccountNames, useOpsStaff } from '@/queries/ops-staff';
import { STAFF_SCOPE_LABEL, type OpsStaff } from '@/api/ops';
import { C, F, R, S } from '@/theme';

const metaOf = (s: OpsStaff) =>
  [
    ...s.scopes.map((scope) => STAFF_SCOPE_LABEL[scope]),
    s.categoryIds.length ? `${s.categoryIds.length} danh mục` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Danh sách staff (master): mỗi người kèm việc toàn hệ thống, số danh mục và tình trạng quyền — đang hiệu lực hay đang
 * treo kèm lý do — lọc được theo danh mục (spec staff-permissions). Gắn quyền cho người mới bắt đầu từ chọn tài khoản.
 */
export default function OpsStaffList() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const staff = useOpsStaff(categoryId);
  const categories = useOpsCategories().data ?? [];
  const names = useAccountNames(staff.data?.map((s) => s.accountId) ?? []);

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Staff"
        sub={staff.data ? `${staff.data.length} người` : undefined}
        right={
          <IconButton
            icon="user-plus"
            label="Gắn quyền staff"
            variant="glass"
            onPress={() => router.push('/ops/staff/pick')}
          />
        }
      />
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="Mọi danh mục"
            selected={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(c.id)}
            />
          ))}
        </ScrollView>
      </View>
      {staff.isPending ? (
        <Loading />
      ) : staff.isError ? (
        <EmptyState icon="lock" text={staff.error.message} />
      ) : (
        <FlatList
          data={staff.data}
          keyExtractor={(s) => s.accountId}
          contentContainerStyle={styles.list}
          onRefresh={() => void staff.refetch()}
          refreshing={staff.isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="shield"
              text={
                categoryId
                  ? 'Danh mục này chưa có staff — việc của nó vào hàng master.'
                  : 'Chưa có ai mang quyền staff. Bấm + để gắn quyền cho một tài khoản.'
              }
            />
          }
          renderItem={({ item }) => {
            const name = names.get(item.accountId) ?? `Tài khoản ${item.accountId.slice(0, 8)}…`;
            return (
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/ops/staff/[id]', params: { id: item.accountId, name } })
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <Avatar name={name} size={40} />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.meta}>{metaOf(item)}</Text>
                  {item.suspended && (
                    <Text style={styles.warn}>
                      Đang treo: {item.suspendedReason ?? 'không rõ lý do'}
                    </Text>
                  )}
                </View>
                <Tag
                  label={item.suspended ? 'Đang treo' : 'Hiệu lực'}
                  tone={item.suspended ? 'amber' : 'brand'}
                />
                <Feather name="chevron-right" size={18} color={C.muted} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  chips: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md },
  list: { padding: S.lg, paddingTop: 0, gap: S.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  warn: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.warnTx },
});
