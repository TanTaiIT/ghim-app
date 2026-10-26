import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { OpsAccount } from '@/api/ops';
import { OpsAccountList } from '@/components/OpsAccountList';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { useOfferGroupOwner } from '@/queries/ops-groups';
import { C } from '@/theme';

/**
 * Master chọn người nhận làm chủ nhóm: giao lần đầu, giao cho nhóm thiếu chủ, hay giao đè. Người được giao thấy lời
 * mời ở "Nhóm của tôi" và đồng ý trong 14 ngày; tới lúc đó nhóm vẫn ở trạng thái cũ.
 */
export default function OpsGroupOwner() {
  const { id = '', name = '' } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const toast = useToast();
  const offer = useOfferGroupOwner();
  const [picked, setPicked] = useState<OpsAccount | null>(null);

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Giao chủ nhóm" sub={name || 'Chọn một tài khoản đã có'} />
      <OpsAccountList onOpen={setPicked} />
      <ConfirmSheet
        visible={picked !== null}
        title={`Giao chủ ${name} cho ${picked?.displayName ?? ''}?`}
        confirmLabel="Giao chủ"
        note="Người nhận đồng ý trong 14 ngày; lời giao hay lời chuyển chủ đang chờ (nếu có) bị huỷ"
        onClose={() => setPicked(null)}
        onConfirm={() =>
          picked &&
          offer.mutate(
            { id, accountId: picked.id },
            {
              onSuccess: () => {
                toast(`Đã gửi lời giao chủ cho ${picked.displayName}`);
                router.back();
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
