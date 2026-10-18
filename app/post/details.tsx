import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from '@/components/Chip';
import { Field } from '@/components/Field';
import { PickerSheet } from '@/components/PickerSheet';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { missingRequired, TemplateFields } from '@/components/TemplateFields';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { useCategoryTemplate, useProvinces, useWards } from '@/queries/catalog';
import { useSaveDraft } from '@/queries/posting';
import { snapshotDraft, useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';
import { groupThousands, parseDigits } from '@/utils/format';

/** Phường/xã là tuỳ chọn — server chỉ cần tỉnh để người mua lọc được tin. */
const NO_WARD = 'none';

/**
 * Bước 2 — giá, thông số theo mẫu danh mục, mô tả, khu vực, nơi hiển thị. Thiết kế có gợi ý khoảng giá và
 * chọn nhóm để đăng kèm: server chưa có gợi ý giá, còn nhóm vẫn là dữ liệu mẫu, nên tin lên toàn sàn.
 */
export default function PostDetails() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();
  const [sheet, setSheet] = useState<'province' | 'ward' | null>(null);

  const d = useDraftStore();
  const template = useCategoryTemplate(d.categoryId);
  const provinces = useProvinces();
  const wards = useWards(d.provinceCode);
  const save = useSaveDraft();

  const fields = template.data ?? [];
  const province = provinces.data?.find((p) => p.code === d.provinceCode);
  const ward = wards.data?.find((w) => w.code === d.wardCode);
  const ready =
    d.price > 0 &&
    province !== undefined &&
    template.isSuccess &&
    !missingRequired(fields, d.attributes);

  const saveDraft = () =>
    save.mutate(snapshotDraft(), {
      onSuccess: () => {
        useDraftStore.getState().reset();
        close();
        toast('Đã lưu nháp — làm tiếp ở Cá nhân › Đang đăng');
      },
      onError: (e) => toast(e.message),
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={2}
        title={d.editingLive ? 'Sửa tin' : 'Đăng tin mới'}
        caption="Giá, mô tả & nơi hiển thị"
        onSaveDraft={d.editingLive ? undefined : saveDraft}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.h2}>Giá bán</Text>
          <View style={styles.price}>
            <TextInput
              accessibilityLabel="Giá bán"
              value={d.price > 0 ? groupThousands(d.price) : ''}
              onChangeText={(t) => d.patch({ price: parseDigits(t) })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
              style={styles.priceInput}
            />
            <Text style={styles.unit}>đ</Text>
          </View>
          <Check
            label="Cho phép người mua trả giá"
            checked={d.negotiable}
            onPress={() => d.patch({ negotiable: !d.negotiable })}
          />
        </View>

        {fields.length > 0 && (
          <TemplateFields
            fields={fields}
            values={d.attributes}
            onChange={(name, value) => d.patch({ attributes: { ...d.attributes, [name]: value } })}
          />
        )}

        <Field
          label="Mô tả chi tiết"
          multiline
          value={d.description}
          onChangeText={(t) => d.patch({ description: t })}
          placeholder="Tình trạng, phụ kiện kèm theo, bảo hành, nơi xem hàng…"
        />

        <View style={styles.section}>
          <Text style={styles.h2}>Khu vực</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheet('province')}
            style={styles.select}
          >
            <Feather name="map-pin" size={18} color={C.brand} />
            <Text style={[styles.selectText, !province && styles.placeholder]}>
              {province?.name ?? 'Chọn tỉnh / thành phố'}
            </Text>
            <Feather name="chevron-down" size={18} color={C.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!province}
            onPress={() => setSheet('ward')}
            style={[styles.select, !province && styles.disabled]}
          >
            <Feather name="navigation" size={18} color={C.brand} />
            <Text style={[styles.selectText, !ward && styles.placeholder]}>
              {ward?.name ?? 'Phường / xã (không bắt buộc)'}
            </Text>
            <Feather name="chevron-down" size={18} color={C.ink} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Hiển thị tin ở đâu?</Text>
          <View style={styles.where}>
            <Feather name="globe" size={20} color={C.brand} />
            <View style={styles.flex}>
              <Text style={styles.whereTitle}>Toàn sàn</Text>
              <Text style={styles.small}>Mọi người đều tìm thấy tin của bạn</Text>
            </View>
            <Feather name="check-circle" size={22} color={C.brand} accessibilityLabel="Luôn bật" />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PinButton
          label="Tiếp theo: Xem trước"
          icon="chevron-right"
          iconRight
          disabled={!ready}
          onPress={() => router.push('/post/preview')}
        />
      </View>

      <PickerSheet
        visible={sheet === 'province'}
        title="Tỉnh / thành phố"
        options={(provinces.data ?? []).map((p) => ({ value: String(p.code), label: p.name }))}
        value={d.provinceCode === null ? null : String(d.provinceCode)}
        // Phường thuộc về tỉnh: đổi tỉnh thì phường cũ không còn đúng.
        onSelect={(code) => d.patch({ provinceCode: Number(code), wardCode: null })}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'ward'}
        title={`Phường / xã · ${province?.name ?? ''}`}
        options={[
          { value: NO_WARD, label: 'Không chọn phường / xã' },
          ...(wards.data ?? []).map((w) => ({ value: String(w.code), label: w.name })),
        ]}
        value={d.wardCode === null ? NO_WARD : String(d.wardCode)}
        onSelect={(code) => d.patch({ wardCode: code === NO_WARD ? null : Number(code) })}
        onClose={() => setSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, paddingTop: 18, gap: 22 },
  section: { gap: S.sm },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.brandBright,
  },
  priceInput: { flex: 1, fontFamily: F.uiBlack, fontSize: 17, color: C.price, paddingVertical: 0 },
  unit: { fontFamily: F.uiBold, fontSize: 15, color: C.inkSoft },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
  },
  selectText: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink },
  placeholder: { color: C.muted },
  disabled: { opacity: 0.5 },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.md,
    backgroundColor: C.sand,
  },
  whereTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
