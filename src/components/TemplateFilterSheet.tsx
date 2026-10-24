import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AttributeFilters, AttributeRange, TemplateField } from '@/api/client';
import { BarButton } from './ActionBar';
import { Chip } from './Chip';
import { Field } from './Field';
import { C, F, R, S } from '@/theme';
import { parseDigits } from '@/utils/format';

/** Mục lọc được của mẫu: mục chữ không lọc (TK 11), nên bảng không hiện nó. */
export const filterableFields = (fields: TemplateField[]): TemplateField[] =>
  fields.filter((f) => f.type !== 'text');

/**
 * Bảng lọc "Thông tin" theo mẫu của danh mục đang chọn: mục chọn (một hay nhiều) là các chip bật tắt — tin khớp khi
 * có một trong các giá trị đã chọn; mục số là hai ô từ, tới. Sửa trên bản nháp, chỉ "Áp dụng" mới đổi bộ lọc —
 * mỗi lần đổi là một lượt tìm, không để bàn phím gõ số bắn liên tiếp.
 */
export function TemplateFilterSheet({
  visible,
  fields,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  fields: TemplateField[];
  value: AttributeFilters;
  onApply: (next: AttributeFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grip} />
          <Text style={styles.title}>Thông tin</Text>
          {visible && (
            <SheetForm fields={fields} initial={value} onApply={onApply} onClose={onClose} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const pickedOf = (draft: AttributeFilters, name: string): string[] => {
  const v = draft[name];
  return Array.isArray(v) ? v : [];
};
const rangeOf = (draft: AttributeFilters, name: string): AttributeRange => {
  const v = draft[name];
  return v !== undefined && !Array.isArray(v) ? v : {};
};

/** Bỏ mục không chọn gì và khoảng không có đầu nào — server coi chúng là bộ lọc sai. */
const clean = (draft: AttributeFilters): AttributeFilters =>
  Object.fromEntries(
    Object.entries(draft).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : v.min !== undefined || v.max !== undefined,
    ),
  );

/** Tách ra để bản nháp sống theo lần mở bảng, không theo vòng đời màn hình. */
function SheetForm({
  fields,
  initial,
  onApply,
  onClose,
}: {
  fields: TemplateField[];
  initial: AttributeFilters;
  onApply: (next: AttributeFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AttributeFilters>(initial);
  const toggle = (name: string, option: string) => {
    const picked = pickedOf(draft, name);
    const next = picked.includes(option) ? picked.filter((x) => x !== option) : [...picked, option];
    setDraft({ ...draft, [name]: next });
  };
  const setEnd = (name: string, end: keyof AttributeRange, text: string) => {
    const range = { ...rangeOf(draft, name) };
    if (text.replace(/\D/g, '') === '') delete range[end];
    else range[end] = parseDigits(text);
    setDraft({ ...draft, [name]: range });
  };
  const reversed = fields.some((f) => {
    const { min, max } = rangeOf(draft, f.name);
    return min !== undefined && max !== undefined && min > max;
  });

  return (
    <>
      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {fields.map((f) =>
          f.type === 'number' ? (
            <View key={f.name} style={styles.group}>
              <Text style={styles.label}>{f.label}</Text>
              <View style={styles.range}>
                {(['min', 'max'] as const).map((end) => {
                  const n = rangeOf(draft, f.name)[end];
                  return (
                    <View key={end} style={styles.half}>
                      <Field
                        label={end === 'min' ? 'Từ' : 'Tới'}
                        value={n === undefined ? '' : String(n)}
                        keyboardType="number-pad"
                        onChangeText={(text) => setEnd(f.name, end, text)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View key={f.name} style={styles.group}>
              <Text style={styles.label}>{f.label}</Text>
              <View style={styles.options}>
                {f.options.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={pickedOf(draft, f.name).includes(o)}
                    onPress={() => toggle(f.name, o)}
                  />
                ))}
              </View>
            </View>
          ),
        )}
        {reversed && <Text style={styles.warn}>Ô "Từ" không được lớn hơn ô "Tới".</Text>}
      </ScrollView>
      <View style={styles.row}>
        <BarButton
          label="Xoá"
          tone="ghost"
          onPress={() => {
            onApply({});
            onClose();
          }}
        />
        <BarButton
          label="Áp dụng"
          disabled={reversed}
          onPress={() => {
            onApply(clean(draft));
            onClose();
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    backgroundColor: C.paperWarm,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S.sm,
    paddingHorizontal: S.lg,
    gap: S.md,
    maxHeight: '85%',
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.lineStrong,
  },
  title: { fontFamily: F.uiBold, fontSize: 18, color: C.ink },
  body: { flexGrow: 0 },
  group: { gap: S.sm, marginBottom: S.lg },
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  range: { flexDirection: 'row', gap: S.md },
  half: { flex: 1 },
  warn: { fontFamily: F.ui, fontSize: 13, color: C.price, marginBottom: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
});
