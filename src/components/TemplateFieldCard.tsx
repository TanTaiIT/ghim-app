import { StyleSheet, Text, View } from 'react-native';
import { Check, Chip } from './Chip';
import { Field } from './Field';
import { IconButton } from './ui';
import type { TemplateField } from '@/api/client';
import { FIELD_TYPE_LABEL, isChoiceField } from '@/api/ops';
import { C, F, R, S } from '@/theme';

const TYPES = Object.keys(FIELD_TYPE_LABEL) as TemplateField['type'][];

/**
 * Một mục đang soạn: `optionsText` giữ đúng chữ người gõ (dấu phẩy, khoảng trắng) tới lúc lưu mới tách; `fresh` = mục
 * thêm trong lượt soạn này, chưa từng có trên server.
 */
export type EditField = TemplateField & {
  key: string;
  optionsText: string;
  nameTouched: boolean;
  fresh: boolean;
};

/**
 * Thẻ sửa một mục của mẫu thông tin. Mục đã phát hành khoá tên và kiểu (`locked`): tin cũ giữ giá trị theo tên, người
 * mua lọc theo tên xuyên mọi phiên bản — đổi là tách bộ lọc làm hai (server `lockedFieldIssue`). Nhãn thì đổi được.
 */
export function TemplateFieldCard({
  field: f,
  index,
  locked,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  field: EditField;
  index: number;
  locked: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<EditField>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Mục {index + 1}</Text>
        {!first && <IconButton icon="arrow-up" label="Đưa lên" onPress={() => onMove(-1)} />}
        {!last && <IconButton icon="arrow-down" label="Đưa xuống" onPress={() => onMove(1)} />}
        <IconButton icon="trash-2" label={`Bỏ mục ${index + 1}`} onPress={onRemove} />
      </View>
      <Field
        label="Nhãn người dùng thấy"
        value={f.label}
        onChangeText={(label) => onChange({ label })}
        placeholder="Hãng"
      />
      <Field
        label={locked ? 'Tên để lọc — đã phát hành, không đổi được' : 'Tên để lọc (không dấu)'}
        value={f.name}
        editable={!locked}
        onChangeText={(name) => onChange({ name, nameTouched: true })}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="hang"
      />
      <View style={styles.types}>
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={FIELD_TYPE_LABEL[t]}
            selected={t === f.type}
            onPress={() => !locked && onChange({ type: t })}
          />
        ))}
      </View>
      {isChoiceField(f.type) && (
        <Field
          label="Lựa chọn, cách nhau bằng dấu phẩy"
          value={f.optionsText}
          onChangeText={(optionsText) => onChange({ optionsText })}
          placeholder="Apple, Samsung, Xiaomi"
        />
      )}
      <Check
        checked={f.required}
        label="Bắt buộc điền khi đăng"
        onPress={() => onChange({ required: !f.required })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  title: { flex: 1, fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
