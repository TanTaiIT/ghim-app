import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MyStrike } from '@/api/client';
import { InputSheet } from '@/components/InputSheet';
import { StrikeCard } from '@/components/StrikeCard';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useAppealStrike, useMyStanding } from '@/queries/strikes';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

/**
 * Cảnh cáo của tôi: điểm vi phạm đang tính, tạm dừng đăng tin (nếu có), từng cảnh cáo và khiếu nại. Mở từ trang Cá
 * nhân và từ thông báo cảnh cáo — câu nhắc "Khiếu nại được tới ngày …" dẫn về đây.
 */
export default function Warnings() {
  const toast = useToast();
  const standing = useMyStanding();
  const appeal = useAppealStrike();
  const [target, setTarget] = useState<MyStrike | null>(null);

  const submit = (statement: string) => {
    if (!target) return;
    appeal.mutate(
      { strikeId: target.id, statement },
      {
        onSuccess: () => {
          setTarget(null);
          toast('Đã gửi khiếu nại');
        },
        onError: (e) => toast(e.message),
      },
    );
  };

  const data = standing.data;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Cảnh cáo của tôi" />
      <FlatList
        data={data?.strikes ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          data ? (
            <View style={styles.summary}>
              <Text style={styles.label}>Điểm vi phạm đang tính</Text>
              <Text style={styles.points}>{data.points}</Text>
              {data.postingLockedUntil && (
                <Text style={styles.lock}>
                  Đang tạm dừng đăng tin mới tới ngày {formatDate(data.postingLockedUntil)}.
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => <StrikeCard item={item} onAppeal={() => setTarget(item)} />}
        ListEmptyComponent={
          standing.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon="shield"
              text={standing.error?.message ?? 'Bạn chưa nhận cảnh cáo nào.'}
            />
          )
        }
      />
      <InputSheet
        visible={target !== null}
        title="Khiếu nại cảnh cáo"
        note={target?.rule}
        label="Vì sao cảnh cáo này chưa đúng"
        placeholder="Kể rõ để người xét hiểu chuyện"
        confirmLabel="Gửi khiếu nại"
        minLength={10}
        multiline
        busy={appeal.isPending}
        onSubmit={submit}
        onClose={() => setTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
  summary: {
    padding: S.md,
    gap: S.xs,
    marginBottom: S.xs,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
  },
  label: { fontFamily: F.uiSemi, fontSize: 13, color: C.warnTx },
  points: { fontFamily: F.uiBold, fontSize: 28, color: C.warnTx },
  lock: { fontFamily: F.uiSemi, fontSize: 13, lineHeight: 18, color: C.warnTx },
});
