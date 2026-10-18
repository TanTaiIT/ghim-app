import { StyleSheet, Text, View } from 'react-native';
import type { AttributeValue, TemplateField } from '@/api/client';
import { Chip } from './Chip';
import { Field } from './Field';
import { C, F, S } from '@/theme';

/**
 * Ô "Thông số" theo mẫu của danh mục — mỗi danh mục một bộ ô do master soạn, nên app không biết trước tên
 * ô nào. Ô bắt buộc mang dấu `*`; thiếu thì lượt gửi duyệt bị server từ chối kèm câu báo.
 */
export function TemplateFields({
  fields,
  values,
  onChange,
}: {
  fields: TemplateField[];
  values: Record<string, AttributeValue>;
  onChange: (name: string, value: AttributeValue) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Thông số</Text>
      {fields.map((f) => {
        const label = f.required ? `${f.label} *` : f.label;
        const value = values[f.name];
        if (f.type === 'text' || f.type === 'number') {
          return (
            <Field
              key={f.name}
              label={label}
              value={typeof value === 'string' ? value : ''}
              keyboardType={f.type === 'number' ? 'number-pad' : 'default'}
              onChangeText={(v) => onChange(f.name, v)}
            />
          );
        }
        const picked = Array.isArray(value) ? value : value ? [value] : [];
        const toggle = (o: string) =>
          f.type === 'single_choice'
            ? onChange(f.name, picked.includes(o) ? '' : o)
            : onChange(f.name, picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]);
        return (
          <View key={f.name} style={styles.choice}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.options}>
              {f.options.map((o) => (
                <Chip key={o} label={o} selected={picked.includes(o)} onPress={() => toggle(o)} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Ô bắt buộc còn trống — khoá nút "Tiếp theo" thay vì để server trả lỗi ở bước cuối. */
export function missingRequired(fields: TemplateField[], values: Record<string, AttributeValue>) {
  return fields.some((f) => {
    const v = values[f.name];
    return f.required && (v === undefined || (Array.isArray(v) ? v.length === 0 : v.trim() === ''));
  });
}

const styles = StyleSheet.create({
  section: { gap: S.md },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  choice: { gap: S.sm },
  label: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
