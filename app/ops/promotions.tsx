import { StyleSheet, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState } from '@/components/ui';
import { C } from '@/theme';

/**
 * Đẩy tin & doanh thu. Server chưa có gói đẩy tin hay ví Xu (change `add-promotions`, `add-wallet` còn chờ — xem
 * `ghim-server/docs/KE-HOACH-GOI-DAY-TIN.md`), nên màn này giữ chỗ trong bộ màn, không có số liệu giả.
 */
export default function OpsPromotions() {
  return (
    <View style={styles.screen}>
      <OpsHeader back title="Đẩy tin & gói" sub="Doanh thu, cấu hình gói" />
      <EmptyState
        icon="zap"
        title="Chưa có API"
        text="Gói đẩy tin, doanh thu theo ngày và bật / tắt gói cần server làm xong phần gói đẩy tin và ví Xu."
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
