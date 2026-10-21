import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader, useOpsBack } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { useCreateCategory } from '@/queries/ops-catalog';
import { RISK_LABEL, type RiskLevel } from '@/api/ops';
import { C, F, S } from '@/theme';
import { formatVnd, parseDigits } from '@/utils/format';

const RISKS = Object.keys(RISK_LABEL) as RiskLevel[];

/**
 * Thêm danh mục (master) với phiên bản cài đặt máy duyệt đầu tiên. Cài đặt này người dùng không thấy (TK 13, nguyên tắc
 * 8): app chỉ đọc tên danh mục. Bỏ trống trần giá = không có trần.
 */
export default function OpsCategoryNew() {
  const back = useOpsBack();
  const toast = useToast();
  const create = useCreateCategory();
  const [name, setName] = useState('');
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [alwaysManual, setAlwaysManual] = useState(false);
  const [groupReview, setGroupReview] = useState<'group' | 'platform'>('group');
  const [cap, setCap] = useState('');
  const priceCap = parseDigits(cap);

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Thêm danh mục" sub="Người dùng chỉ thấy tên danh mục" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            label="Tên danh mục"
            value={name}
            onChangeText={setName}
            placeholder="Điện thoại"
          />
          <Text style={styles.label}>Mức rủi ro</Text>
          <View style={styles.row}>
            {RISKS.map((r) => (
              <Choice
                key={r}
                label={RISK_LABEL[r]}
                selected={r === risk}
                onPress={() => setRisk(r)}
              />
            ))}
          </View>
          <Check
            checked={alwaysManual}
            onPress={() => setAlwaysManual((v) => !v)}
            label="Luôn để người duyệt — máy không tự cho tin lên"
          />
          <Text style={styles.label}>Tin trong nhóm do ai duyệt</Text>
          <View style={styles.row}>
            <Choice
              label="Quản trị nhóm"
              selected={groupReview === 'group'}
              onPress={() => setGroupReview('group')}
            />
            <Choice
              label="Staff của sàn"
              selected={groupReview === 'platform'}
              onPress={() => setGroupReview('platform')}
            />
          </View>
          <Field
            label="Trần giá (không bắt buộc)"
            value={cap}
            onChangeText={setCap}
            keyboardType="number-pad"
            placeholder="Để trống nếu không giới hạn"
            hint={priceCap > 0 ? formatVnd(priceCap) : undefined}
          />
          <PinButton
            label="Thêm danh mục"
            disabled={name.trim().length < 2}
            loading={create.isPending}
            onPress={() =>
              create.mutate(
                {
                  name,
                  riskLevel: risk,
                  alwaysManual,
                  groupReview,
                  priceCap: priceCap > 0 ? priceCap : null,
                },
                {
                  onSuccess: () => {
                    toast(`Đã thêm danh mục ${name.trim()}`);
                    back();
                  },
                  onError: (e) => toast(e.message),
                },
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  label: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
