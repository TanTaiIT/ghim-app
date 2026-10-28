import { StyleSheet, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState } from '@/components/ui';
import { C } from '@/theme';

/**
 * Gói đẩy tin trả Xu. Ví Xu đã có (master cấp ở hồ sơ người dùng); server chưa có gói (change `add-promotions` — xem
 * `ghim-server/docs/KE-HOACH-GOI-DAY-TIN.md`), nên màn này giữ chỗ trong bộ màn, không có số liệu giả. Không có
 * doanh thu: Xu không mua bằng tiền (chốt 28/10/2026).
 */
export default function OpsPromotions() {
  return (
    <View style={styles.screen}>
      <OpsHeader back title="Gói đẩy tin" sub="Cấu hình gói trả Xu" />
      <EmptyState
        icon="zap"
        title="Chưa có API"
        text="Soạn gói và bật / tắt gói cần server làm xong phần gói đẩy tin. Cấp Xu cho người dùng ở hồ sơ người đó (Người dùng → chọn người)."
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
