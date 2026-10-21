import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading } from '@/components/ui';
import {
  useAddReasonTemplate,
  useReasonTemplates,
  useSetReasonTemplateActive,
} from '@/queries/ops-review';
import { C, F, R, S } from '@/theme';

/**
 * Lý do từ chối mẫu (master). Người đăng đọc nguyên câu này khi tin bị từ chối hay bị gỡ vì sai sót, nên câu phải nói
 * được họ cần sửa gì. Không xoá được — tắt để ngừng dùng; quyết định cũ giữ câu đã dùng.
 */
export default function OpsReasons() {
  const toast = useToast();
  const reasons = useReasonTemplates();
  const add = useAddReasonTemplate();
  const toggle = useSetReasonTemplateActive();
  const [adding, setAdding] = useState(false);

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Lý do từ chối mẫu"
        sub="Người đăng đọc nguyên câu này"
        right={
          <IconButton
            icon="plus"
            label="Thêm lý do"
            variant="glass"
            onPress={() => setAdding(true)}
          />
        }
      />
      {reasons.isPending ? (
        <Loading />
      ) : reasons.isError ? (
        <EmptyState icon="lock" text={reasons.error.message} />
      ) : (
        <FlatList
          data={reasons.data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="x-octagon"
              title="Chưa có lý do mẫu"
              text="Chưa có lý do thì không ai từ chối hay gỡ được tin. Bấm + để thêm."
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.active && styles.off]}>
              <Text style={styles.text}>{item.text}</Text>
              <BarButton
                compact
                fit
                tone={item.active ? 'ghost' : 'primary'}
                label={item.active ? 'Tắt' : 'Bật'}
                loading={toggle.isPending && toggle.variables?.id === item.id}
                onPress={() =>
                  toggle.mutate(
                    { id: item.id, active: !item.active },
                    { onError: (e) => toast(e.message) },
                  )
                }
              />
            </View>
          )}
        />
      )}
      <InputSheet
        visible={adding}
        title="Thêm lý do từ chối"
        label="Câu người đăng sẽ đọc"
        placeholder="Ảnh không phải ảnh thật của món đồ — chụp lại ảnh thật rồi gửi lại"
        confirmLabel="Thêm"
        multiline
        minLength={10}
        busy={add.isPending}
        onClose={() => setAdding(false)}
        onSubmit={(text) =>
          add.mutate(text, {
            onSuccess: () => {
              setAdding(false);
              toast('Đã thêm lý do');
            },
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
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
  off: { backgroundColor: C.sand },
  text: { flex: 1, fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
});
