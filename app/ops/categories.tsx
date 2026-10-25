import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, Tag } from '@/components/ui';
import { useOpsCategories, useRenameCategory, useSetCategoryActive } from '@/queries/ops-catalog';
import { RISK_LABEL, type OpsCategory } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

/**
 * Danh mục (master). Server không có sẵn danh mục nào: chưa tạo thì app người dùng không đăng tin được (bước chọn danh
 * mục trống). Cài đặt máy duyệt và mẫu thông tin của từng danh mục sửa ở màn của nó (`/ops/category/[id]`).
 */
export default function OpsCategories() {
  const router = useRouter();
  const toast = useToast();
  const categories = useOpsCategories();
  const rename = useRenameCategory();
  const toggle = useSetCategoryActive();
  const [renaming, setRenaming] = useState<OpsCategory | null>(null);

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Danh mục"
        sub={
          categories.data ? `${categories.data.filter((c) => c.active).length} đang bật` : undefined
        }
        right={
          <IconButton
            icon="plus"
            label="Thêm danh mục"
            variant="glass"
            onPress={() => router.push('/ops/category/new')}
          />
        }
      />
      {categories.isPending ? (
        <Loading />
      ) : categories.isError ? (
        <EmptyState icon="lock" text={categories.error.message} />
      ) : (
        <FlatList
          data={categories.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="layers"
              title="Chưa có danh mục"
              text="Người dùng chưa đăng tin được cho tới khi có ít nhất một danh mục đang bật. Bấm + để thêm."
            />
          }
          renderItem={({ item }) => {
            const busy = toggle.isPending && toggle.variables?.id === item.id;
            return (
              <View style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Tag
                    label={item.active ? 'Đang bật' : 'Đã tắt'}
                    tone={item.active ? 'brand' : 'neutral'}
                  />
                </View>
                <View style={styles.tags}>
                  <Tag
                    label={RISK_LABEL[item.riskLevel]}
                    tone={item.riskLevel === 'high' ? 'boost' : 'neutral'}
                  />
                  {item.alwaysManual && <Tag label="Luôn duyệt tay" tone="amber" />}
                  <Tag
                    label={
                      item.groupReview === 'group' ? 'Tin nhóm: nhóm duyệt' : 'Tin nhóm: sàn duyệt'
                    }
                  />
                  <Tag
                    label={
                      item.templateVersion
                        ? `Mẫu thông tin v${item.templateVersion}`
                        : 'Chưa có mẫu thông tin'
                    }
                  />
                  {item.priceCap !== null && <Tag label={`Trần ${formatVnd(item.priceCap)}`} />}
                </View>
                <Text style={styles.meta}>Cài đặt máy duyệt phiên bản {item.settingsVersion}</Text>
                <View style={styles.actions}>
                  <BarButton
                    compact
                    tone="ghost"
                    label="Cài đặt & mẫu"
                    onPress={() =>
                      router.push({ pathname: '/ops/category/[id]', params: { id: item.id } })
                    }
                  />
                  <BarButton
                    compact
                    tone="ghost"
                    label="Đổi tên"
                    onPress={() => setRenaming(item)}
                  />
                  <BarButton
                    compact
                    tone={item.active ? 'dangerSoft' : 'primary'}
                    label={item.active ? 'Tắt' : 'Bật lại'}
                    loading={busy}
                    onPress={() =>
                      toggle.mutate(
                        { id: item.id, active: !item.active },
                        {
                          onSuccess: () =>
                            toast(item.active ? `Đã tắt ${item.name}` : `Đã bật ${item.name}`),
                          onError: (e) => toast(e.message),
                        },
                      )
                    }
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      <InputSheet
        visible={renaming !== null}
        title="Đổi tên danh mục"
        note="Đổi tên không tạo phiên bản cài đặt mới; tin đã đăng hiện tên mới."
        label="Tên mới"
        initial={renaming?.name ?? ''}
        confirmLabel="Đổi tên"
        minLength={2}
        busy={rename.isPending}
        onClose={() => setRenaming(null)}
        onSubmit={(name) =>
          renaming &&
          rename.mutate(
            { id: renaming.id, name },
            {
              onSuccess: () => {
                setRenaming(null);
                toast('Đã đổi tên danh mục');
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.md },
  card: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  name: { flex: 1, fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  actions: { flexDirection: 'row', gap: 10, marginTop: S.xs },
});
